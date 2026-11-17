import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'
import './mocks'
import { server } from './mocks/server'

expect.extend(toHaveNoViolations)

const { getComputedStyle } = window
window.getComputedStyle = (elt) => getComputedStyle(elt)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
