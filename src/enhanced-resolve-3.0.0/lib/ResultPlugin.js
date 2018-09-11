/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var assign = require("object-assign");

/**
 * 处理结果
 * @param {String} source 绑定的开始事件
 */
function ResultPlugin(source) {
	this.source = source;
}

module.exports = ResultPlugin;

ResultPlugin.prototype.apply = function(resolver) {
	var target = this.target;
	
	resolver.plugin(this.source, function(request, callback) {
		var obj = assign({}, request);
		resolver.applyPluginsAsyncSeries1("result", obj, function(err) {
			if(err) return callback(err);
			callback(null, obj);
		});
	});
};
