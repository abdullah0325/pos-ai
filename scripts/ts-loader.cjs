const ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module')
const cache=new Map()
function load(file){const filename=path.resolve(file);if(cache.has(filename))return cache.get(filename).exports;const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));cache.set(filename,mod);const original=mod.require.bind(mod);mod.require=name=>name.startsWith('./')?load(path.resolve(path.dirname(filename),name+'.ts')):original(name);mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);return mod.exports}
module.exports={load}
