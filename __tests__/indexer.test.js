import mockConsole from 'jest-mock-console'
import Config from '../src/config'
import Indexer from '../src/indexer'
import Logger from '../src/logger'

// Mocks to avoid hitting ElasticSearch
import ClientSuccessFake from '../__mocks__/client-success-fake'
import ClientFailureFake from '../__mocks__/client-failure-fake'
import ClientErrorFake from '../__mocks__/client-error-fake'

// Outermost-scope variable to support mocking/restoring the `console` object
let restoreConsole = null

describe('Indexer', () => {
  let indexer = new Indexer()

  describe('constructor()', () => {
    test('creates a client with a hostname', () => {
      let host = `${Config.indexHost}:${Config.indexPort}`
      expect(indexer.client.transport._config.host).toEqual(host)
    })
    test('creates a logger', () => {
      expect(indexer.logger).toBeInstanceOf(Logger)
    })
    test('creates known index results', () => {
      expect(indexer.knownIndexResults).toEqual(['created', 'updated'])
    })
    test('creates known delete results', () => {
      expect(indexer.knownDeleteResults).toEqual(['deleted'])
    })
  })
  describe('index()', () => {
    let clientMock = new ClientSuccessFake()
    let indexSpy = jest.spyOn(clientMock, 'index')
    let json = { '@id': 'http://foo.bar/12345', foo: 'bar' }

    beforeAll(() => {
      indexer.client = clientMock
      // Eat console output
      restoreConsole = mockConsole(['error', 'debug'])
    })
    afterAll(() => {
      restoreConsole()
    })
    test('calls index() on the client', () => {
      indexer.index(json, 'http://foo.bar/12345')
      expect(indexSpy).toHaveBeenCalledWith({
        index: Config.indexName,
        type: Config.indexType,
        id: '12345',
        body: json
      })
    })
    describe('when indexing succeeds', () => {
      test('returns true', () => {
        return indexer.index(json)
          .then(result => {
            expect(result).toEqual(true)
          })
      })
    })
    describe('when indexing fails', () => {
      let clientMock = new ClientFailureFake()
      let logSpy = jest.spyOn(indexer.logger, 'error')

      beforeEach(() => {
        indexer.client = clientMock
      })
      test('throws and logs an error', () => {
        return indexer.index(json)
          .then(() => {
            expect(logSpy).toHaveBeenCalledWith('error indexing: {}')
          })
      })
    })
    describe('when indexing raises an exception', () => {
      let clientMock = new ClientErrorFake()
      let logSpy = jest.spyOn(indexer.logger, 'error')

      beforeEach(() => {
        indexer.client = clientMock
      })
      test('logs the error', async () => {
        expect.assertions(1)
        await indexer.index(json)
        expect(logSpy).toHaveBeenCalledWith('error indexing: what a useful error message this is')
      })
    })
  })
  describe('delete()', () => {
    let clientMock = new ClientSuccessFake()
    let deleteSpy = jest.spyOn(clientMock, 'delete')
    let uri = 'http://foo.bar/12345'

    beforeEach(() => {
      indexer.client = clientMock
    })
    beforeAll(() => {
      // Eat console output
      restoreConsole = mockConsole(['error', 'debug'])
    })
    afterAll(() => {
      restoreConsole()
    })
    test('calls delete() on the client', () => {
      indexer.delete(uri)
      expect(deleteSpy).toHaveBeenCalledWith({
        index: Config.indexName,
        type: Config.indexType,
        id: '12345'
      })
    })
    describe('when delete succeeds', () => {
      test('returns true', () => {
        return indexer.delete(uri)
          .then(result => {
            expect(result).toEqual(true)
          })
      })
    })
    describe('when delete fails', () => {
      let clientMock = new ClientFailureFake()
      let logSpy = jest.spyOn(indexer.logger, 'error')

      beforeEach(() => {
        indexer.client = clientMock
      })
      test('throws and logs an error', () => {
        return indexer.delete(uri)
          .then(() => {
            expect(logSpy).toHaveBeenCalledWith('error deleting: {}')
          })
      })
    })
    describe('when delete raises an exception', () => {
      let clientMock = new ClientErrorFake()
      let logSpy = jest.spyOn(indexer.logger, 'error')

      beforeEach(() => {
        indexer.client = clientMock
      })
      test('logs the error', async () => {
        expect.assertions(1)
        await indexer.delete(uri)
        expect(logSpy).toHaveBeenCalledWith('error deleting: what a useful error message this is')
      })
    })
  })
  describe('identifier_from()', () => {
    beforeAll(() => {
      // Eat console output
      restoreConsole = mockConsole(['error', 'debug'])
    })
    afterAll(() => {
      restoreConsole()
    })
    test('removes URI scheme/host/port', () => {
      expect(indexer.identifier_from('https://localhost:8080/one-two-three')).toBe('one-two-three')
    })
    describe('with a pathless URI', () => {
      test('returns pre-configured value', () => {
        expect(indexer.identifier_from('https://localhost:8080/')).toBe(Config.rootNodeIdentifier)
      })
    })
  })
})
