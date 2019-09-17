const path = require('path')
const fs = require('fs')
const parser = require('posthtml-parser')
const cloneDeep = require('lodash/cloneDeep')
const glob = require('glob')
const isURL = require('parcel-bundler/src/utils/is-url')
const assert = require('assert')

const util = require('util')
// require('console-group').install()

/**
 * @typedef {Object} ComponentDefinition
 */

/**
 * @typedef {[string, ComponentDefinition]} FullComponentDefinition
 */

/**
 * @typedef {Object} PluginOptions
 * @param {string} rootPath - Root path of project
 */

const resolvePath = (options = {}, currentPath = '.') => {
	const rootPath = path.resolve(options.rootPath || __dirname, currentPath)
	return rootPath
}

const walk = (node, callback, idx) => {
	let content = Array.isArray(node) ? node : node.content || []

	content = content
		.map(callback)
		.filter(_ => !!_)
		.map((node, idx, content) => walk(node, callback, idx, content))

	if (Array.isArray(node)) {
		return content
	}

	node.content = content
	return node
}

/**
 * Convert hyphens in string to camelCase
 * @param {string} inputString
 */
const hyphensToCamelCase = inputString =>
	inputString.replace(/-([a-z])/g, g => g[1].toUpperCase())

const ATTRS = {
	script: ['src'],
	img: ['src', 'srcset'],
	audio: ['src'],
	video: ['src', 'poster'],
	source: ['src', 'srcset'],
	track: ['src'],
	iframe: ['src'],
	embed: ['src'],
	link: ['href'],
	a: ['href'],
	use: ['href', 'xlink:href'],
	image: ['xlink:href'],
	// meta: ['content'],
	object: ['data'],
}

const resolveAssetPath = (node, componentRootPath, options = {}) => {
	if (typeof node === 'object') {
		const pathAttrs = ATTRS[node.tag]

		if (!pathAttrs || !node.attrs) {
			return node
		}

		const rootPath = options.rootPath || __dirname
		node.attrs = Object.entries(node.attrs).reduce(
			(resultAttrs, [currentAttr, value]) => {
				if (pathAttrs.includes(currentAttr) && !isURL(value)) {
					const absolutePath = path.resolve(componentRootPath, value)
					// value = absolutePath
					value = path.relative(rootPath, absolutePath)
				}

				return {
					...resultAttrs,
					[currentAttr]: value,
				}
			},
			{},
		)
	}

	return node
}

// const getRootPath = () => {

// }

/**
 * Detect root path for build process
 * @returns {string}
 */
const getRootPath = () => {
	const entryFilePath = process.argv[process.argv.length - 1]
	const parsedPath = path.parse(entryFilePath)

	return path.resolve(process.cwd(), parsedPath.dir)

	// const parcelPathIdx = process.argv.indexOf(require.main.filename)
	// const isParcel = parcelPathIdx >= 0
	// console.log(isParcel, process.argv, require.main.filename)

	// if (isParcel) {
	// 	const entryFilePath = process.argv[process.argv.length - 1]
	// 	const parsedPath = path.parse(entryFilePath)

	// 	console.log(process.resolve(process.cwd(), parsedPath.dir))

	// 	return process.resolve(process.cwd(), parsedPath.dir)
	// }

	// const executedFilename = require.main.filename
	// const nodeModulesIdx = executedFilename.indexOf('/node_modules')
	// if (nodeModulesIdx >= 0) {
	// 	const rootPath = executedFilename.substring(0, nodeModulesIdx)
	// 	return rootPath
	// } else {
	// 	return path.dirname(executedFilename)
	// }
}

const getComponentDefinition = (options = {}, componentPath = '') => {
	const normalPath = resolvePath(options, componentPath)

	let html = ''
	let definition = null

	const parsedPath = path.parse(componentPath)
	const componentName = parsedPath.name

	try {
		html = fs.readFileSync(normalPath, options.encoding)
	} catch (error) {}

	try {
		definition = parser(html)
		definition = walk(definition, node =>
			resolveAssetPath(node, parsedPath.dir, options),
		)
	} catch (error) {}

	return [componentName, definition, normalPath]
}

/**
 * Collect components definitions
 * @param {PluginOptions} options
 * @param {string} componentGlobPath
 * @returns {FullComponentDefinition[]}
 */
const getComponentsDefinitions = (options = {}, componentGlobPath) => {
	let components = []
	let normalPath = resolvePath(options, componentGlobPath)
	const hasMagick = glob.hasMagic(normalPath)

	if (!hasMagick) {
		const pathState = fs.statSync(normalPath)
		if (pathState.isDirectory()) {
			normalPath = path.resolve(normalPath, '**/**.html')
		}
	}

	components = glob
		.sync(normalPath)
		.map(componentPath => getComponentDefinition(options, componentPath))

	return components
}

const interpolationRegex = /(?:(?<![\\])[{])((?:[\\][}]|[^}])*?)(?:[}])/gim

/**
 * Evaluate interpolation placeholders for input string
 * @param {string} inputString Input string
 * @param {Object} locals Local varables
 * @param {*} emptyValue Local varables
 */
const resolveVariable = (inputString, locals = {}, emptyValue = undefined) => {
	if (!inputString) {
		return ''
	}

	assert(typeof inputString === 'string', 'inputString must be a String type')
	return inputString.replace(interpolationRegex, (_, attributeName) => {
		const safeAttributeName = attributeName.trim()
		const variableExists = safeAttributeName in locals

		return (variableExists ? locals[safeAttributeName] : emptyValue) + ''
	})
}

const applyComponents = (rootNodes, componentsDefinitions, options = {}) => {
	if (Array.isArray(rootNodes)) {
		return rootNodes.reduce((result, rootNode) => {
			const newNode = applyComponents(rootNode, componentsDefinitions, options)

			if (Array.isArray(newNode)) {
				return [...result, ...newNode]
			}
			return [...result, newNode]
		}, [])
	}

	const isComponent =
		typeof rootNodes === 'object' && rootNodes.tag in componentsDefinitions

	if (isComponent) {
		return applyDefinition(rootNodes, componentsDefinitions, options)
	}

	return rootNodes
}

const nodeIsComponent = (node, componentsDefinitions) =>
	typeof node === 'object' && node.tag in componentsDefinitions

const resolveNodeVariables = (node, variables = {}, options = {}) => {
	if (typeof node === 'string') {
		// childNode = `${childNode}${tabulation}`
		return resolveVariable(node, variables, '')
	}

	if (node.attrs) {
		node.attrs = Object.entries(node.attrs).reduce((result, [key, value]) => {
			if (typeof value === 'string') {
				value = resolveVariable(value, variables, '')
			}

			return { ...result, [key]: value }
		}, {})
	}

	if (node.content) {
		node.content = node.content.map(node =>
			resolveNodeVariables(node, variables, options),
		)
	}

	return node
}

const applyDefinition = (nestNode, componentsDefinitions, options = {}) => {
	const componentDefinition = componentsDefinitions[nestNode.tag]

	const { tabulation, onAsset = () => {} } = options

	let resultComponent = cloneDeep(componentDefinition)
	let childrenComponent = cloneDeep(nestNode.content)

	resultComponent = walk(resultComponent, node => {
		if (!node) {
			return node
		}

		// const isAssetNode =
		// 	['link'].indexOf(node.tag) >= 0 &&
		// 	(!node.content || !node.content.length) &&
		// 	node.attrs &&
		// 	typeof node.attrs === 'object'

		// if (isAssetNode) {
		// 	if (node.tag === 'link' && node.attrs.href && !isURL(node.attrs.href)) {
		// 		onAsset(node.attrs.href)

		// 		const fileContent = fs.readFileSync(node.attrs.href, 'UTF-8')

		// 		return {
		// 			tag: 'style',
		// 			attrs: {
		// 				type: 'css',
		// 			},
		// 			content: [fileContent],
		// 		}
		// 	}
		// }

		// node = applyDefinitionToContent(node, componentsDefinitions, options)

		if (node.content) {
			node.content = node.content.reduce((result, childNode, idx, content) => {
				childNode = resolveNodeVariables(childNode, nestNode.attrs)

				if (nodeIsComponent(childNode, componentsDefinitions)) {
					const childNodes = applyDefinition(
						childNode,
						componentsDefinitions,
						options,
					)

					return [...result, ...childNodes]
				}

				return [...result, childNode]
			}, [])
		}

		if (nodeIsComponent(node, componentsDefinitions)) {
			node = applyDefinition(node, componentsDefinitions, options)
		}

		if (node.attrs) {
			node.attrs = Object.entries(node.attrs).reduce((result, [key, value]) => {
				if (typeof value === 'string') {
					value = resolveVariable(value, nestNode.attrs, '')
				}

				return { ...result, [key]: value }
			}, {})
		}

		if (node.tag === 'slot' && node.attrs.name === 'children') {
			const resultChildrenComponents = applyComponents(
				childrenComponent || node.content,
				componentsDefinitions,
				options,
			)

			return resultChildrenComponents
		}

		return node
	})

	return resultComponent
}

const endlineRegex = /(\r\n|[\r\n\u0085\u2028\u2029])/gim

module.exports = {
	resolvePath,
	getComponentDefinition,
	getComponentsDefinitions,
	walk,
	interpolationRegex,
	resolveVariable,
	applyDefinition,
	endlineRegex,
	getRootPath,
	hyphensToCamelCase,
	applyComponents,
}
