import * as ts from 'typescript';
import * as tjs from 'typescript-json-schema';

export interface TypeArgument {
    type?: string | {
        $ref: string;
    };
    typeArguments?: TypeArgument[];
    properties?: {};
    constraint?: TypeArgument;
}

export type Parameter = TypeArgument & {
    name: string;
    optional?: boolean;
};

export interface Definition extends tjs.Definition {
    typeArguments?: TypeArgument[];
    parameters?: Parameter[];
    returnType?: string | {
        $ref: string;
    };
    returnTypeArguments?: TypeArgument[];
    typeParameters?: TypeArgument[];
    optional?: boolean;
}

export class Plugin {
  public hook(symbol: ts.Symbol | undefined, definition: Definition): boolean {
    const node = symbol && symbol.getDeclarations() !== undefined ? symbol.getDeclarations()![0] : null;
    if (node && node.kind === ts.SyntaxKind.MethodDeclaration) {
      this.getMethodDefinition(node as ts.MethodDeclaration, definition);
      return true;
    }
    return false;
  }

  private getMethodDefinition(declaration: ts.MethodDeclaration, definition: Definition) {
    definition.type = "method";
    definition.parameters = this.getMethodParameters(declaration.parameters);
    if (declaration.typeParameters) {
      definition.typeParameters = this.getMethodParameters(declaration.typeParameters);
    }
    var returnType = this.getTypeDescription(declaration.type);
    if (returnType.type) {
      definition.returnType = returnType.type;
    }
    if (returnType.typeArguments) {
      definition.returnTypeArguments = returnType.typeArguments;
    }
    if (declaration.questionToken && declaration.questionToken.kind === ts.SyntaxKind.QuestionToken) {
      definition.optional = true;
    }
    delete definition.description;
    return definition;
  }

  private getMethodParameters(parameters: ts.NodeArray<ts.Declaration>): Array<Parameter> {
    return [...parameters].sort((param1, param2) => {
      return param1.pos - param2.pos;
    }).map((parameter: ts.Declaration) => {
      return this.getMethodParameter(parameter);
    });
  }

  private getMethodParameter(parameter: ts.Declaration): Parameter {
    let typeObject: TypeArgument = {};
    if (this.declarationIsPrameterDeclaration(parameter)) {
      typeObject = this.getTypeDescription(parameter.type);
    } else if (this.declarationIsTypeParameterDeclaration(parameter)) {
      typeObject = this.getTypeDescription(parameter);
    } else {
      return {name: "__name_not_found__"};
    }

    const parameterObject: Parameter = {
      name: parameter.name.getText(),
    };

    if (this.declarationIsPrameterDeclaration(parameter) && parameter.questionToken && parameter.questionToken.kind === ts.SyntaxKind.QuestionToken) {
      parameterObject.optional = true;
    }

    if (this.declarationIsTypeParameterDeclaration(parameter) && parameter.constraint) {
      parameterObject.constraint = this.getTypeDescription(parameter.constraint);
    }

    if (typeObject.type) {
      parameterObject.type = typeObject.type;
    }

    if (typeObject.typeArguments) {
      parameterObject.typeArguments = typeObject.typeArguments;
    }

    return parameterObject;
  }

  private declarationIsPrameterDeclaration(declaration: ts.Declaration): declaration is ts.ParameterDeclaration {
    return declaration.kind === ts.SyntaxKind.Parameter;
  }

  private declarationIsTypeParameterDeclaration(declaration: ts.Declaration): declaration is ts.TypeParameterDeclaration {
    return declaration.kind === ts.SyntaxKind.TypeParameter;
  }

  private getTypeDescription(type?: ts.Node): TypeArgument {
    const typeObject: TypeArgument = {};

    if (!type) {
      return typeObject;
    }

    if (this.typeIsUnionType(type)) {
      typeObject.type = "union";
      typeObject.typeArguments = type.types.map((subType: ts.TypeNode) => {
        return this.getTypeDescription(subType);
      });
    } else if (this.typeIsIntersectionType(type)) {
      typeObject.type = "intersection";
      typeObject.typeArguments = type.types.map((subType: ts.TypeNode) => {
        return this.getTypeDescription(subType);
      });
    } else if (this.typeIsTypeReference(type)) {
      const typeName = type.typeName.getText();
      if (typeName === "Promise") {
        return this.getTypeDescription(type.typeArguments![0]);
      }
      typeObject.type = { $ref: `#/definitions/${typeName}` };
      if (type.typeArguments && type.typeArguments.length > 0) {
        typeObject.typeArguments = type.typeArguments.map((typeArgument: ts.TypeNode) => {
          return this.getTypeDescription(typeArgument);
        });
      }
    } else if (type.kind === ts.SyntaxKind.StringKeyword) {
      typeObject.type = "string";
    } else if (type.kind === ts.SyntaxKind.NumberKeyword) {
      typeObject.type = "number";
    } else if (type.kind === ts.SyntaxKind.BooleanKeyword) {
      typeObject.type = "boolean";
    } else if (this.typeIsTypeLiteral(type)) {
      typeObject.type = "object";
      typeObject.properties = {};
      for (let i = 0; i < type.members.length; i++) {
        const typeMember: ts.TypeElement = type.members[i];
        if (this.typeElementIsPropertySignature(typeMember)) {
          typeObject.properties[typeMember.name.getText()] = this.getTypeDescription(typeMember.type);
        }
      }
    }

    return typeObject;
  }

  private typeIsTypeReference(type: ts.Node): type is ts.TypeReferenceNode {
    return type.kind === ts.SyntaxKind.TypeReference;
  }

  private typeIsUnionType(type: ts.Node): type is ts.UnionTypeNode {
    return type.kind === ts.SyntaxKind.UnionType;
  }

  private typeIsIntersectionType(type: ts.Node): type is ts.IntersectionTypeNode {
    return type.kind === ts.SyntaxKind.IntersectionType;
  }

  private typeIsTypeLiteral(type: ts.Node): type is ts.TypeLiteralNode {
    return type.kind === ts.SyntaxKind.TypeLiteral;
  }

  private typeElementIsPropertySignature(type: ts.Node): type is ts.PropertySignature {
    return type.kind === ts.SyntaxKind.PropertySignature;
  }
}
