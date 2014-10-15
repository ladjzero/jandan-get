var _ = require('underscore'),
	async = require('async'),
	path = require('path'),
	program = require('commander'),
	fs = require('fs'),
	request = require('request');

var range = function (val) {
	return _.map(_.compact(val.split('..')), function (num) {return parseInt(num);});
};

program
	.version('0.1')
	.option('-p, --page <a>..<b>', 'page number, like -p 5, -p 5..10', range)
	.option('-o, --output <path>', 'output dir')
	.parse(process.argv);

var getImgSrc = function (li) {
	var re = /<li id="comment-(\d+)">.+?<span class="righttext"><a .+?>(\d+)<\/a><\/span>.+?org_src="(.+?)".+?<\/li>/g;
	var re2 = /<li id="comment-(\d+)">.+?<span class="righttext"><a .+?>(\d+)<\/a><\/span>.+?img src="(.+?)".+?<\/li>/g;
	var matches = re.exec(li);
	matches || (matches = re2.exec(li));
	return matches ? {
		id: matches[1],
		no: matches[2],
		src: matches[3]
	} : null;
};

var getUrl = function (page) {
	return 'http://jandan.net/ooxx/page-' + page;
};

// img {Object}, src, no, id, page
var downloadByImg = function (img, cb) {
	console.log(img.no + ' ' + img.src);

	try {
		var s = request(img.src).on('end', cb).on('error', function () {cb()});
		var ext = img.src.substr(img.src.lastIndexOf('.'));
		ext = /^.\w+$/.test(ext) ? ext : '.jpg';
		s.pipe(fs.createWriteStream(path.join(program.output || __dirname, img.page + '-' + img.id + ext)));
		console.log(path.join(program.output || __dirname, img.page + '-' + img.id + ext));
	} catch (e) {
		cb(e);
	}
};

var downloadByPage = function (page, cb) {
	console.log('page ' + page);

	request(getUrl(page), function (err, res, data) {
		data = data.replace(/(\n|\r\n)/g, '');
		var matches = data.match(/<li id="comment-\d+">.+?<\/li>/g);
		var imgs = _.compact(_.map(matches, getImgSrc));
		_.map(imgs, function (img) {
			return _.extend(img, {page: page})
		});

		
		async.eachLimit(imgs, 10, downloadByImg, cb);
	});
};

console.log(program.page, program.output);

if (_.every(program.page)) {
	try {
		var pages;
		
		if (program.page.length == 1) {
			pages = [program.page[0]];
		} else if (program.page.length == 2) {
			pages = _.range(program.page[0], program.page[1] + 1);
		}

		async.eachSeries(pages, downloadByPage, function (err) {console.log(err)});
	} catch (e) {
		console.log(e);
	}
} else {
	console.log('bad arguments');
	return;
}