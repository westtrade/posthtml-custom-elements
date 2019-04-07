const parcel = require('parcel-bundler')
const Bundler = require('parcel-bundler')
const path = require('path')

// Путь к файлу точки входа
const file = path.resolve(__dirname, './index.html')

// Опции упаковщика (Bundler)
const options = {
	outDir: './dist', // Каталог для файлов сборки, по умолчанию - dist
	outFile: 'index.html', // Имя выходного файла
	publicUrl: './', // Путь, который обслуживает сервер, по умолчанию - '/'
	watch: true, // следует ли отслеживать изменения файлов и пересобирать их при изменении, по умолчанию - process.env.NODE_ENV !== 'production'
	cache: false, // Включает или отключает кеширование, по умолчанию - true
	cacheDir: '.cache', // Каталог кеширования, по умолчанию .cache
	minify: false, // Минизировать файлы, включено если process.env.NODE_ENV === 'production'
	target: 'browser', // browser/node/electron, по умолчанию - browser
	https: false, // Использовать защищённое соединение (https) для файлов, по умолчанию - false
	logLevel: 3, // 3 = логировать всё, 2 = логировать предупреждения и ошибки, 1 = логировать ошибки
	hmrPort: 0, // Порт на котором работает сокет hmr, по умолчанию - случайный свободный порт (0 в node.js определяет случайный свободный порт)
	sourceMaps: true, // Включить или отключить sourcemaps, по умолчанию включено (пока ещё не поддерживается в минифицированных сборках)
	hmrHostname: '', // Имя хоста для модуля горячей перезагрузки, по умолчанию - ''
	detailedReport: true, // Распечатывает подробный отчёт о бандлах, ресурсах, размерах файлов и времени, по умолчанию - false, отчёты распечатываются, если watch отключен
}

async function runBundle() {
	// Инициализует упаковщик, используя местоположение точки входа и предоставленные опции
	const bundler = new Bundler(file, options)

	// bundler.addAssetType('htm', require.resolve('../parcel/index'))
	// bundler.addAssetType('html', require.resolve('../parcel/index'))

	// Запускает упаковщик и возвращает главную сборку
	// Используйте события, если вы используете режим watch, поскольку этот промис запускает только один раз, а не при каждой пересборки
	const bundle = await bundler.bundle()
}

runBundle()

// const posthtml = require('posthtml')
// const fs = require('fs')
// const path = require('path')

// const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf-8')

// const main = async () => {
// 	const result = await posthtml()
// 		// .use(require('posthtml-custom-elements')())
// 		.use(
// 			require('../plugins/custom-elements')({
// 				rootPath: __dirname
// 			})
// 		)
// 		.process(html)

// 	fs.writeFileSync(path.resolve(__dirname, './index.out.html'), result.html)
// }

// main()
