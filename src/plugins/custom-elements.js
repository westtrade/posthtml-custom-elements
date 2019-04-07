const path = require('path')
const {
	getComponentsDefinitions,
	applyDefinition,
	endlineRegex,
	getRootPath,
} = require('./utils')

const DEFAULT_OPTIONS = {
	encoding: 'utf-8',
	rootPath: getRootPath(),
}

module.exports = (options = {}) => {
	options = {
		...DEFAULT_OPTIONS,
		...options,
	}

	options.rootPath = options.rootPath || './'

	const components = {}
	return tree => {
		tree.walk(node => {
			if (node.content) {
				node.content = node.content.reduce(
					(result, childNode, idx, content) => {
						if (childNode.tag === 'link' && childNode.attrs.rel === 'include') {
							const relativeGlobPath = path.resolve(
								options.rootPath,
								childNode.attrs.path || '',
							)

							const definitions = getComponentsDefinitions(
								options,
								relativeGlobPath,
							)

							definitions.forEach(([componentName, definition, src]) => {
								components[componentName] = definition

								if (tree.messages) {
									tree.messages.push({
										type: 'dependency',
										file: src,
									})
								}
							})

							return result
						}

						const isComponent =
							typeof childNode === 'object' && childNode.tag in components

						if (isComponent) {
							let tabulation = ''

							const prevNode = content[idx - 1]
							if (typeof prevNode === 'string') {
								tabulation = prevNode.replace(endlineRegex, '')
							}

							const childNodes = applyDefinition(
								childNode,
								components[childNode.tag],
								tabulation,
							)

							return [...result, ...childNodes]
						}

						return [...result, childNode]
					},
					[],
				)
			}

			return node
		})

		return tree
	}
}
