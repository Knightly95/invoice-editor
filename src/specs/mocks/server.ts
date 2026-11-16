import { setupServer } from 'msw/node'
import definition from 'api/gen/schema.json'
import { http, HttpResponse } from 'msw'

export const server = setupServer()
export const serverBaseURL = 'http://localhost/api'

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options'

const httpMethods: HttpMethod[] = [
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'options',
]

const isHttpMethod = (method: string): method is HttpMethod => {
  return httpMethods.includes(method as HttpMethod)
}

const getEndpointConfiguration = (
  endpointName: string
): { path: string; method: HttpMethod } => {
  let foundPath: string | undefined
  let foundMethod: string | undefined

  if (definition && definition.paths) {
    for (const [path, methods] of Object.entries(definition.paths)) {
      for (const [method, operation] of Object.entries<any>(methods)) {
        if (operation.operationId === endpointName) {
          foundPath = path
          foundMethod = method
          break
        }
      }
      if (foundPath) break
    }
  }

  if (!foundPath || !foundMethod) {
    throw new Error(`Endpoint "${endpointName}" not found in schema`)
  }

  if (!isHttpMethod(foundMethod)) {
    throw new Error(`Method "${foundMethod}" not found in schema`)
  }

  return { path: foundPath, method: foundMethod }
}

const buildUrl = (
  path: string,
  params?: {
    pathParams?: Record<string, string>
    queryParams?: Record<string, string>
  }
) => {
  let url = path
  url = url.replace(/{(\w+)}/g, (match, key) => {
    if (params && params.pathParams?.[key]) {
      return params.pathParams[key]
    }
    throw new Error(`Path parameter "${key}" not found in path "${path}"`)
  })
  if (params && params.queryParams) {
    url = url.concat(
      `?${Object.entries(params.queryParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')}`
    )
  }
  return serverBaseURL + url
}

export const mockEndpoint = ({
  endpointName,
  params,
  response,
  status = 200,
}: {
  endpointName: string
  params?: {
    pathParams?: Record<string, string>
    queryParams?: Record<string, string>
  }
  response: any
  /** HTTP status code to return. Defaults to 200. */
  status?: number
}) => {
  const endpointConfiguration = getEndpointConfiguration(endpointName)
  const url = buildUrl(endpointConfiguration.path, params)
  server.use(
    http[endpointConfiguration.method](url, () => {
      return HttpResponse.json(response, { status })
    })
  )
}
