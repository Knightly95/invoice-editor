import '@testing-library/jest-dom'
import './mocks'
import { server } from './mocks/server'

const { getComputedStyle } = window
window.getComputedStyle = (elt) => getComputedStyle(elt)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
