const path = require('path')
const fs = require('fs')
const parser = require('posthtml-parser')
const cloneDeep = require('lodash/cloneDeep')
const glob = require('glob')
const isURL = require('parcel-bundler/src/utils/is-url')

/**
 * @typedef {Object} ComponentDefinition
 */

/**
 * @typedef {[string, ComponentDefinition]} FullComponentDefinition
 */

/**
 * @typedef {Object} PluginOptions
 * @param {String} rootPath - Root path of project
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
	meta: ['content'],
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
 * @returns {String}
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

const getComponentDefinition = (options = {}, componentPath) => {
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
 * @param {String} componentGlobPath
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
const resolveVariable = (inputString, locals = {}) => {
	return inputString.replace(interpolationRegex, (_, attributeName) => {
		return (locals[attributeName.trim()] || '') + ''
	})
}

const applyComponents = (rootNodes, componentsDefinitions, tabulation = '') => {
	if (Array.isArray(rootNodes)) {
		return rootNodes.map(rootNode =>
			applyComponents(rootNode, componentsDefinitions, tabulation),
		)
	}

	const isComponent =
		typeof rootNodes === 'object' && rootNodes.tag in componentsDefinitions

	if (isComponent) {
		return applyDefinition(rootNodes, componentsDefinitions, tabulation)
	}

	return [rootNodes]
}

const applyDefinition = (nestNode, componentsDefinitions, tabulation = '') => {
	const componentDefinition = componentsDefinitions[nestNode.tag]

	let resultComponent = cloneDeep(componentDefinition)
	let childrenComponent = cloneDeep(nestNode.content)

	resultComponent = walk(resultComponent, node => {
		if (node.content) {
			node.content = node.content.reduce((result, childNode, idx, content) => {
				// let prevNode = content[idx - 1]
				if (typeof childNode === 'string') {
					childNode = `${childNode}${tabulation}`
					childNode = resolveVariable(childNode, nestNode.attrs)

					return [...result, childNode]
				}

				if (childNode.attrs) {
					childNode.attrs = Object.entries(childNode.attrs).reduce(
						(result, [key, value]) => {
							if (typeof value === 'string') {
								value = resolveVariable(value, nestNode.attrs)
							}

							return { ...result, [key]: value }
						},
						{},
					)
				}

				const isComponent =
					typeof childNode === 'object' &&
					childNode.tag in componentsDefinitions

				if (isComponent) {
					const childNodes = applyDefinition(childNode, components, tabulation)

					return [...result, ...childNodes]
				}

				return [...result, childNode]
			}, [])
		}

		if (node.attrs) {
			node.attrs = Object.entries(node.attrs).reduce((result, [key, value]) => {
				if (typeof value === 'string') {
					value = resolveVariable(value, nestNode.attrs)
				}

				return { ...result, [key]: value }
			}, {})
		}

		if (node.tag === 'slot' && node.attrs.name === 'children') {
			const resultChildrenComponents = applyComponents(
				childrenComponent || node.content,
				componentsDefinitions,
				tabulation,
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
}
