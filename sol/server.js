const request = require('request')
const sax = require('sax')
const URL = require('url')
const async = require('async')

const CONCURRANCY = 1

const q = async.queue(function(task, callback) {
	return fetch(task, callback)
}, CONCURRANCY);

q.push({mode: 'index', url: 'http://storiesonline.net/library/authors.php?let=A'})

function fetch(task, callback) {
	console.log('fetch', task)
	request.get(task.url, (error, response, body) => {
		if(error) {
			console.log('error', error)
			callback(error)
			return
		}
		if(task.mode === 'index') {
			processIndexBody(task.url, body)
		} else if(task.mode === 'author') {
			processAuthorBody(task.url, body)
		} else {
			console.error('Unknown mode', task.mode, task)
		}
		callback()
	})
}

function processIndexBody(url, body) {
	let in_author = false
	let author_name = ""
	let author_link = ""

	const parser = sax.parser(false, {trim: true, lowercase: true, normalize: true})
	parser.onerror = function(e) {
		console.log('error', e)
	}
	parser.ontext = function(text) {
		//console.log('text', e)
		if(in_author) {
			//console.log('author', text)
			author_name += text
		}
	}
	parser.onopentag = function(tag) {
		if(tag.name === 'th' && hasClass(tag, 'l')) {
			//console.log('onopentag', 'author', tag)
			in_author = true
			author_name = ""
		} else if(tag.name === 'a' && in_author) {
			//console.log('onopentag', 'author', 'link', tag)
			author_link = tag.attributes.href
		} else {
			console.log('onopentag', tag)
		}
	}
	parser.onclosetag = function(tag) {
		if(tag.name === 'th' && hasClass(tag, 'l')) {
			//console.log('onclosetag', 'author', tag)
			console.log('onclosetag', 'author', {link: URL.resolve(url, author_link), name: author_name})
			q.push({mode: 'author', url: URL.resolve(url, author_link)})
			in_author = false
			author_name = ""
			author_link = ""
		} else {
			console.log('onclosetag', tag)
		}
	}
	parser.onend = function() {
		console.log('onend')
	}
	parser.write(body).close();
}

function processAuthorBody(url, body) {
	let in_lc_block = false

	const parser = sax.parser(false, {trim: true, lowercase: true, normalize: true})
	parser.onerror = function(e) {
		console.log('error', e)
	}
	parser.ontext = function(text) {
		if(in_lc_block) {
			console.log('text', 'lc', text)
		}
	}
	parser.onopentag = function(tag) {
		if(tag.name === 'td' && hasClass(tag, 'lc', 2)) {
			console.log('onopentag', 'lc', tag)
			in_lc_block = true
		} else if(in_lc_block) {
			console.log('onopentag', 'lc', tag)
		}
	}
	parser.onclosetag = function(tag) {
		if(tag.name === 'td' && hasClass(tag, 'lc', 2)) {
			console.log('onclosetag', 'lc', tag)
			in_lc_block = false
		} else if(in_lc_block) {
			console.log('onclosetag', 'lc', tag)
		}
	}
	parser.onend = function() {
		console.log('onend')
	}
	parser.write(body).close();
}


function hasClass(tag, cls, max_len) {
	max_len = max_len || 0
	const classes = (tag.attributes.class || "").split(/\s+/) || []
	return classes.some(element => {
		const head = (max_len > 0 ? element.substring(0, max_len) : element)
		return head === cls
	})
}
