import { promisify } from 'util';
import * as fs from 'fs';

const readFile = promisify(fs.readFile);

async function main() {
  const contents = await readFile('example/rpc.ts', 'utf-8');
  console.log(contents.replace(/([a-z][a-z\d]+)(\([^)]*\)):\s*([^;]*)/mig,
    (_, n, p, r) => `${n}: { params: { ${p.slice(1, -1)} }, returns: ${r} }`));
}

main();

// import * as ts from 'typescript';
// import { getProgramFromFiles, SymbolRef } from 'typescript-json-schema';
//
// // export function getProgramFromFiles(
// //   files: string[], jsonCompilerOptions: any = {}, basePath: string = "./"): ts.Program {
// //     // use built-in default options
// //     const compilerOptions = ts.convertCompilerOptionsFromJson(jsonCompilerOptions, basePath).options;
// //     const options: ts.CompilerOptions = {
// //       noEmit: true,
// //       emitDecoratorMetadata: true,
// //       experimentalDecorators: true,
// //       target: ts.ScriptTarget.ES5,
// //       module: ts.ModuleKind.CommonJS,
// //     };
// //     for (const k in compilerOptions) {
// //         if (compilerOptions.hasOwnProperty(k)) {
// //             options[k] = compilerOptions[k];
// //         }
// //     }
// //     return ts.createProgram(files, options);
// // }
//
// function getMainFileSymbols(program: ts.Program, onlyIncludeFiles: string[], userSymbols: { [name: string]: ts.Symbol }): string[] {
//   function includeFile(file: ts.SourceFile): boolean {
//     if (onlyIncludeFiles === undefined) {
//       return !file.isDeclarationFile;
//     }
//     return onlyIncludeFiles.indexOf(file.fileName) >= 0;
//   }
//   const files = program.getSourceFiles().filter(includeFile);
//   if (files.length) {
//     return Object.keys(userSymbols).filter((key) => {
//       const symbol = userSymbols[key];
//       if (!symbol || !symbol.declarations || !symbol.declarations.length) {
//         return false;
//       }
//       let node: ts.Node = symbol.declarations[0];
//       while (node && node.parent) {
//         node = node.parent;
//       }
//       return files.indexOf(node.getSourceFile()) > -1;
//     });
//   }
//   return [];
// }
//
// function main() {
//   let program: ts.Program;
//   const files = ['example/rpc.ts'];
//
//   program = getProgramFromFiles(files, {
//       strictNullChecks: true,
//   });
//
//   const symbols: SymbolRef[] = [];
//   const allSymbols: { [name: string]: ts.Type } = {};
//   const userSymbols: { [name: string]: ts.Symbol } = {};
//   const inheritingTypes: { [baseName: string]: string[] } = {};
//
//   const typeChecker = program.getTypeChecker();
//
//   program.getSourceFiles().forEach((sourceFile, _sourceFileIdx) => {
//     function inspect(node: ts.Node, tc: ts.TypeChecker) {
//
//       if (node.kind === ts.SyntaxKind.ClassDeclaration
//         || node.kind === ts.SyntaxKind.InterfaceDeclaration
//         || node.kind === ts.SyntaxKind.EnumDeclaration
//         || node.kind === ts.SyntaxKind.TypeAliasDeclaration
//       ) {
//         const symbol: ts.Symbol = (node as any).symbol;
//         const nodeType = tc.getTypeAtLocation(node);
//         const fullyQualifiedName = tc.getFullyQualifiedName(symbol);
//         const typeName = fullyQualifiedName.replace(/".*"\./, "");
//         const name = typeName;
//
//         symbols.push({ name, typeName, fullyQualifiedName, symbol });
//         allSymbols[name] = nodeType;
//
//         // if (sourceFileIdx === 1) {
//         if (!sourceFile.hasNoDefaultLib) {
//           userSymbols[name] = symbol;
//         }
//
//         const baseTypes = nodeType.getBaseTypes() || [];
//
//         baseTypes.forEach((baseType) => {
//           const baseName = tc.typeToString(baseType, undefined, ts.TypeFormatFlags.UseFullyQualifiedType);
//           if (!inheritingTypes[baseName]) {
//             inheritingTypes[baseName] = [];
//           }
//           inheritingTypes[baseName].push(name);
//         });
//       } else {
//         ts.forEachChild(node, (n) => inspect(n, tc));
//       }
//     }
//     inspect(sourceFile, typeChecker);
//   });
//   console.log(getMainFileSymbols(program, files, userSymbols));
// }
//
// main();
