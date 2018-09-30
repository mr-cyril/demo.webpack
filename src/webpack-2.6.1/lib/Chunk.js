/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const compareLocations = require("./compareLocations");
let debugId = 1000;

const byId = (a, b) => {
  if (a.id < b.id) return -1;
  if (b.id < a.id) return 1;
  return 0;
};

/**
 * 代码块
 * 
 * @class Chunk
 */
class Chunk {

  /**
   * Creates an instance of Chunk.
   * @param {String} name 块名
   * @param {Module} module 模块实例
   * @param {SourceLocation} loc 模块的引用语句的位置
   * @memberof Chunk
   */
  constructor(name, module, loc) {
    this.id = null;
    this.ids = null;
    this.debugId = debugId++;
    this.name = name;
    this.modules = [];
    this.entrypoints = [];
    this.chunks = [];
    this.parents = [];
    this.blocks = [];
    this.origins = [];
    this.files = [];
    this.rendered = false;

    if (module) {
      this.origins.push({
        module,
        loc,
        name
      });
    }
  }

  get entry() {
    throw new Error("Chunk.entry was removed. Use hasRuntime()");
  }

  set entry(data) {
    throw new Error("Chunk.entry was removed. Use hasRuntime()");
  }

  get initial() {
    throw new Error("Chunk.initial was removed. Use isInitial()");
  }

  set initial(data) {
    throw new Error("Chunk.initial was removed. Use isInitial()");
  }

  /**
   * 块中是否应该包含运行时
   * 
   * @returns {Boolean}
   * @memberof Chunk
   */
  hasRuntime() {
    if (this.entrypoints.length === 0) {
      return false;
    }

    return this.entrypoints[0].chunks[0] === this;
  }

  /**
   * 是否是初始块 -- 有入口点的块
   * 
   * @returns {Boolean}
   * @memberof Chunk
   */
  isInitial() {
    return this.entrypoints.length > 0;
  }

  /**
   * 
   * 
   * @returns 
   * @memberof Chunk
   */
  hasEntryModule() {
    return !!this.entryModule;
  }

  /**
   * 
   * 
   * @param {any} chunk 
   * @returns 
   * @memberof Chunk
   */
  addChunk(chunk) {
    return this.addToCollection(this.chunks, chunk);
  }

  removeChunk(chunk) {
    const idx = this.chunks.indexOf(chunk);
    if (idx >= 0) {
      this.chunks.splice(idx, 1);
      chunk.removeParent(this);
      return true;
    }
    return false;
  }

  /**
   * 添加父亲块
   * 
   * @param {Chunk} parentChunk 
   * @returns {Boolean}
   * @memberof Chunk
   */
  addParent(parentChunk) {
    return this.addToCollection(this.parents, parentChunk);
  }

  /**
   * 添加属于该块的模块
   * 
   * @param {Module} module 属于该块的模块
   * @returns  {Boolean}
   * @memberof Chunk
   */
  addModule(module) {
    return this.addToCollection(this.modules, module);
  }

  /**
   * 将模块module移动到指定的块chunk
   * @param {Module} module 待移动的模块
   * @param {Chunk} otherChunk 目标模块
   */
  moveModule(module, otherChunk) {
    module.removeChunk(this);
    module.addChunk(otherChunk);
    otherChunk.addModule(module);
    module.rewriteChunkInReasons(this, [otherChunk]);
  }

  /**
   * 
   * 
   * @param {any} module 
   * @returns 
   * @memberof Chunk
   */
  removeModule(module) {
    const idx = this.modules.indexOf(module);

    if (idx >= 0) {
      this.modules.splice(idx, 1);
      module.removeChunk(this);
      return true;
    }

    return false;
  }

  /**
   * 添加块拥有的异步块
   * 
   * @param {Dependencies} block 
   * @returns 
   * @memberof Chunk
   */
  addBlock(block) {
    return this.addToCollection(this.blocks, block);
  }





  removeParent(chunk) {
    const idx = this.parents.indexOf(chunk);
    if (idx >= 0) {
      this.parents.splice(idx, 1);
      chunk.removeChunk(this);
      return true;
    }
    return false;
  }

  /**
   * 
   * @param {Module} module 
   * @param {SourceLocation} loc 
   */
  addOrigin(module, loc) {
    this.origins.push({
      module,
      loc,
      name: this.name
    });
  }

  remove(reason) {
    // cleanup modules
    this.modules.slice().forEach(module => {
      module.removeChunk(this);
    });

    // cleanup parents
    this.parents.forEach(parentChunk => {
      // remove this chunk from its parents
      const idx = parentChunk.chunks.indexOf(this);
      if (idx >= 0) {
        parentChunk.chunks.splice(idx, 1);
      }

      // cleanup "sub chunks"
      this.chunks.forEach(chunk => {
				/**
				 * remove this chunk as "intermediary" and connect
				 * it "sub chunks" and parents directly
				 */
        // add parent to each "sub chunk"
        chunk.addParent(parentChunk);
        // add "sub chunk" to parent
        parentChunk.addChunk(chunk);
      });
    });

		/**
		 * we need to iterate again over the chunks
		 * to remove this from the chunks parents.
		 * This can not be done in the above loop
		 * as it is not garuanteed that `this.parents` contains anything.
		 */
    this.chunks.forEach(chunk => {
      // remove this as parent of every "sub chunk"
      const idx = chunk.parents.indexOf(this);
      if (idx >= 0) {
        chunk.parents.splice(idx, 1);
      }
    });

    // cleanup blocks
    this.blocks.forEach(block => {
      const idx = block.chunks.indexOf(this);
      if (idx >= 0) {
        block.chunks.splice(idx, 1);
        if (block.chunks.length === 0) {
          block.chunks = null;
          block.chunkReason = reason;
        }
      }
    });
  }



  replaceChunk(oldChunk, newChunk) {
    const idx = this.chunks.indexOf(oldChunk);
    if (idx >= 0) {
      this.chunks.splice(idx, 1);
    }
    if (this !== newChunk && newChunk.addParent(this)) {
      this.addChunk(newChunk);
    }
  }

  replaceParentChunk(oldParentChunk, newParentChunk) {
    const idx = this.parents.indexOf(oldParentChunk);
    if (idx >= 0) {
      this.parents.splice(idx, 1);
    }
    if (this !== newParentChunk && newParentChunk.addChunk(this)) {
      this.addParent(newParentChunk);
    }
  }

  integrate(otherChunk, reason) {
    if (!this.canBeIntegrated(otherChunk)) {
      return false;
    }

    const otherChunkModules = otherChunk.modules.slice();
    otherChunkModules.forEach(module => otherChunk.moveModule(module, this));
    otherChunk.modules.length = 0;

    otherChunk.parents.forEach(parentChunk => parentChunk.replaceChunk(otherChunk, this));
    otherChunk.parents.length = 0;

    otherChunk.chunks.forEach(chunk => chunk.replaceParentChunk(otherChunk, this));
    otherChunk.chunks.length = 0;

    otherChunk.blocks.forEach(b => {
      b.chunks = b.chunks ? b.chunks.map(c => {
        return c === otherChunk ? this : c;
      }) : [this];
      b.chunkReason = reason;
      this.addBlock(b);
    });
    otherChunk.blocks.length = 0;

    otherChunk.origins.forEach(origin => {
      this.origins.push(origin);
    });
    this.origins.forEach(origin => {
      if (!origin.reasons) {
        origin.reasons = [reason];
      } else if (origin.reasons[0] !== reason) {
        origin.reasons.unshift(reason);
      }
    });
    this.chunks = this.chunks.filter(chunk => {
      return chunk !== otherChunk && chunk !== this;
    });
    this.parents = this.parents.filter(parentChunk => {
      return parentChunk !== otherChunk && parentChunk !== this;
    });
    return true;
  }

  /**
   * 
   * @param {Chunk} newChunk 
   */
  split(newChunk) {
    this.blocks.forEach(block => {
      newChunk.blocks.push(block);
      block.chunks.push(newChunk);
    });
    this.chunks.forEach(chunk => {
      newChunk.chunks.push(chunk);
      chunk.parents.push(newChunk);
    });
    this.parents.forEach(parentChunk => {
      parentChunk.chunks.push(newChunk);
      newChunk.parents.push(parentChunk);
    });
    this.entrypoints.forEach(entrypoint => {
      entrypoint.insertChunk(newChunk, this);
    });
  }

  isEmpty() {
    return this.modules.length === 0;
  }

  /**
   * 
   * 
   * @param {any} hash 
   * @memberof Chunk
   */
  updateHash(hash) {
    hash.update(`${this.id} `);
    hash.update(this.ids ? this.ids.join(",") : "");
    hash.update(`${this.name || ""} `);
    
    this.modules.forEach(m => m.updateHash(hash));
  }

  canBeIntegrated(otherChunk) {
    if (otherChunk.isInitial()) {
      return false;
    }
    if (this.isInitial()) {
      if (otherChunk.parents.length !== 1 || otherChunk.parents[0] !== this) {
        return false;
      }
    }
    return true;
  }

  addMultiplierAndOverhead(size, options) {
    const overhead = typeof options.chunkOverhead === "number" ? options.chunkOverhead : 10000;
    const multiplicator = this.isInitial() ? (options.entryChunkMultiplicator || 10) : 1;

    return size * multiplicator + overhead;
  }

  modulesSize() {
    let count = 0;
    for (let i = 0; i < this.modules.length; i++) {
      count += this.modules[i].size();
    }
    return count;
  }

  size(options) {
    return this.addMultiplierAndOverhead(this.modulesSize(), options);
  }

  integratedSize(otherChunk, options) {
    // Chunk if it's possible to integrate this chunk
    if (!this.canBeIntegrated(otherChunk)) {
      return false;
    }

    let integratedModulesSize = this.modulesSize();
    // only count modules that do not exist in this chunk!
    for (let i = 0; i < otherChunk.modules.length; i++) {
      const otherModule = otherChunk.modules[i];
      if (this.modules.indexOf(otherModule) === -1) {
        integratedModulesSize += otherModule.size();
      }
    }

    return this.addMultiplierAndOverhead(integratedModulesSize, options);
  }

  /**
   * 获得块与其子块的名称和hash的映射关系
   * @param {Boolean} includeEntries 是否包含入口块
   * @param {Boolean} realHash 是否使用原始的hash值
   */
  getChunkMaps(includeEntries, realHash) {
    const chunksProcessed = []; // 存储 正在处理的Chunk , 避免重复处理
    const chunkHashMap = {};
    const chunkNameMap = {};

    (function addChunk(chunk) {
      if (chunksProcessed.indexOf(chunk) >= 0) return;
      chunksProcessed.push(chunk);

      // !chunk.hasRuntime() -- 不包含初始块
      // includeEntries     --- 是否包含入口块
      if (!chunk.hasRuntime() || includeEntries) {
        chunkHashMap[chunk.id] = realHash
          ? chunk.hash
          : chunk.renderedHash;

        if (chunk.name)
          chunkNameMap[chunk.id] = chunk.name;
      }

      chunk.chunks.forEach(addChunk);
    }(this));

    return {
      hash: chunkHashMap,
      name: chunkNameMap
    };
  }

  sortItems() {
    this.modules.sort(byId);

    this.origins.sort((a, b) => {
      const aIdent = a.module.identifier();
      const bIdent = b.module.identifier();
      if (aIdent < bIdent) return -1;
      if (aIdent > bIdent) return 1;
      return compareLocations(a.loc, b.loc);
    });

    this.origins.forEach(origin => {
      if (origin.reasons)
        origin.reasons.sort();
    });

    this.parents.sort(byId);

    this.chunks.sort(byId);
  }

  toString() {
    return `Chunk[${this.modules.join()}]`;
  }

  checkConstraints() {
    const chunk = this;
    chunk.chunks.forEach((child, idx) => {
      if (chunk.chunks.indexOf(child) !== idx)
        throw new Error(`checkConstraints: duplicate child in chunk ${chunk.debugId} ${child.debugId}`);
      if (child.parents.indexOf(chunk) < 0)
        throw new Error(`checkConstraints: child missing parent ${chunk.debugId} -> ${child.debugId}`);
    });
    chunk.parents.forEach((parentChunk, idx) => {
      if (chunk.parents.indexOf(parentChunk) !== idx)
        throw new Error(`checkConstraints: duplicate parent in chunk ${chunk.debugId} ${parentChunk.debugId}`);
      if (parentChunk.chunks.indexOf(chunk) < 0)
        throw new Error(`checkConstraints: parent missing child ${parentChunk.debugId} <- ${chunk.debugId}`);
    });
  }



  /**
   * 向集合添加项 , 确保项不会重复
   * 
   * @param {Any} collection 
   * @param {Any} item 
   * @returns {Boolean} true , 成功; false , 失败
   * @memberof Chunk
   */
  addToCollection(collection, item) {
    if (item === this) {
      return false;
    }

    if (collection.indexOf(item) > -1) {
      return false;
    }

    collection.push(item);
    return true;
  }
}

module.exports = Chunk;