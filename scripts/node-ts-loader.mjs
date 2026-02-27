import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const projectRoot = process.cwd()
const extensions = ['.ts', '.tsx', '.js', '.mjs', '.cjs']

async function resolveWithExtensions(specifier, parentURL) {
  if (!(specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/'))) {
    return null
  }

  if (path.extname(specifier)) {
    return null
  }

  const parentPath = parentURL ? fileURLToPath(parentURL) : path.join(projectRoot, 'index.js')
  const basePath = specifier.startsWith('/')
    ? path.resolve(projectRoot, `.${specifier}`)
    : path.resolve(path.dirname(parentPath), specifier)

  for (const ext of extensions) {
    const withExt = `${basePath}${ext}`
    try {
      await access(withExt, constants.F_OK)
      return pathToFileURL(withExt).href
    } catch {}
  }

  for (const ext of extensions) {
    const indexPath = path.join(basePath, `index${ext}`)
    try {
      await access(indexPath, constants.F_OK)
      return pathToFileURL(indexPath).href
    } catch {}
  }

  return null
}

async function resolveAlias(specifier) {
  if (!specifier.startsWith('@/')) {
    return null
  }

  const withoutAlias = specifier.slice(2)
  const basePath = path.resolve(projectRoot, withoutAlias)

  for (const ext of extensions) {
    const withExt = `${basePath}${ext}`
    try {
      await access(withExt, constants.F_OK)
      return pathToFileURL(withExt).href
    } catch {}
  }

  for (const ext of extensions) {
    const indexPath = path.join(basePath, `index${ext}`)
    try {
      await access(indexPath, constants.F_OK)
      return pathToFileURL(indexPath).href
    } catch {}
  }

  return pathToFileURL(basePath).href
}

export async function resolve(specifier, context, defaultResolve) {
  const aliasUrl = await resolveAlias(specifier)
  if (aliasUrl) {
    return defaultResolve(aliasUrl, context, defaultResolve)
  }

  const relativeUrl = await resolveWithExtensions(specifier, context.parentURL)
  if (relativeUrl) {
    return defaultResolve(relativeUrl, context, defaultResolve)
  }

  try {
    return await defaultResolve(specifier, context, defaultResolve)
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && !path.extname(specifier)) {
      return defaultResolve(`${specifier}.js`, context, defaultResolve)
    }

    throw error
  }
}

export async function load(url, context, defaultLoad) {
  if (!url.endsWith('.ts') && !url.endsWith('.tsx')) {
    return defaultLoad(url, context, defaultLoad)
  }

  const filename = fileURLToPath(url)
  const source = await readFile(filename, 'utf8')

  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      sourceMap: true
    },
    fileName: filename
  })

  return {
    format: 'module',
    shortCircuit: true,
    source: transpiled.outputText
  }
}
