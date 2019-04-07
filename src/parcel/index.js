const { Asset } = require('parcel-bundler')
const HTMLAsset = require('parcel-bundler/src/assets/HTMLAsset')
const posthtmlTransform = require('parcel-bundler/src/transforms/posthtml')
const loadPlugins = require('parcel-bundler/src/utils/loadPlugins')

module.exports = class HTMLExtendedAsset extends Asset {
	// type = 'html' // set the main output type.
	constructor(name, options) {
		super(name, options)
		this.type = 'html'
		this.isAstDirty = false
		this.hmrPageReload = true
	}

	// async parse(code) {
	// 	return HTMLAsset.prototype.parse
	// }

	// async parse(code) {
	// 	let res = await posthtmlTransform.parse(code, this)
	// 	res.walk = api.walk
	// 	res.match = api.match

	// 	return res
	// }
}

async function getConfig(asset) {
	let config = await asset.getConfig(
		['.posthtmlrc', '.posthtmlrc.js', 'posthtml.config.js'],
		{
			packageKey: 'posthtml',
		},
	)
	if (!config && !asset.options.minify) {
		return
	}

	config = config || {}
	const plugins = config.plugins
	if (typeof plugins === 'object') {
		// This is deprecated in favor of result messages but kept for compatibility
		// See https://github.com/posthtml/posthtml-include/blob/e4f2a57c2e52ff721eed747b65eddf7d7a1451e3/index.js#L18-L26
		const depConfig = {
			addDependencyTo: {
				addDependency: name =>
					asset.addDependency(name, { includedInParent: true }),
			},
		}
		Object.keys(plugins).forEach(p => Object.assign(plugins[p], depConfig))
	}
	config.plugins = await loadPlugins(plugins, asset.name)
	config.skipParse = true
	return config
}
