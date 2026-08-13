import { Injectable } from '@angular/core';

export interface EvaluationResult {
  success: boolean;
  output: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EvaluatorService {

  // Runs a lightweight, sandboxed client-side Python interpreter for basic syllabus statements
  evaluatePython(code: string, inputs: string[] = []): EvaluationResult {
    const consoleLogs: string[] = [];
    const inputQueue = [...inputs];
    const variables: Record<string, unknown> = {};

    const lines = code.split('\n').map(l => l.trim());

    try {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.startsWith('#')) continue; // Skip comments

        // Handle print statement
        if (line.startsWith('print(') && line.endsWith(')')) {
          const innerContent = line.substring(6, line.length - 1);
          const { evaluatedArgs, sep, end } = this.parsePrintArgs(innerContent, variables);
          let printStr = evaluatedArgs.map(val => String(val)).join(sep);
          if (end !== '\n') {
            printStr += end;
          }
          consoleLogs.push(printStr);
          continue;
        }

        // Handle assignment, e.g., var = expr or var = input()
        if (line.includes('=')) {
          const eqIndex = line.indexOf('=');
          const varName = line.substring(0, eqIndex).trim();
          const expr = line.substring(eqIndex + 1).trim();

          // Check if it is an input() statement
          if (expr.startsWith('input(') && expr.endsWith(')')) {
            if (inputQueue.length > 0) {
              variables[varName] = inputQueue.shift();
            } else {
              // Return EOF error or empty
              variables[varName] = '';
            }
            continue;
          }

          // Otherwise evaluate expression
          variables[varName] = this.evalExpression(expr, variables);
          continue;
        }

        // Simple arithmetic evaluations without assignment
        if (this.isMathExpr(line)) {
          const val = this.evalExpression(line, variables);
          consoleLogs.push(String(val));
          continue;
        }

        // If line is unknown and has content, raise syntax error
        if (line.length > 0) {
          throw new Error(`SyntaxError: invalid syntax on line ${i + 1}: "${line}"`);
        }
      }

      return {
        success: true,
        output: consoleLogs.join('\n') + '\n'
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Traceback (most recent call): File "main.py", line 1, Unknown Error';
      return {
        success: false,
        output: consoleLogs.join('\n'),
        error: errMsg
      };
    }
  }

  private parsePrintArgs(content: string, variables: Record<string, unknown>): { evaluatedArgs: unknown[]; sep: string; end: string } {
    // Basic argument splitter by comma, taking care of quotes
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if ((char === '"' || char === "'") && (i === 0 || content[i - 1] !== '\\')) {
        if (inQuotes && char === quoteChar) {
          inQuotes = false;
        } else if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        }
        current += char;
      } else if (char === ',' && !inQuotes) {
        args.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim().length > 0) {
      args.push(current.trim());
    }

    // Now evaluate each argument
    let sep = ' ';
    let end = '\n';
    const evaluatedArgs: unknown[] = [];

    for (const arg of args) {
      if (arg.startsWith('sep=')) {
        const sepExpr = this.evalExpression(arg.substring(4), variables);
        sep = String(sepExpr);
        continue;
      }
      if (arg.startsWith('end=')) {
        const endExpr = this.evalExpression(arg.substring(4), variables);
        end = String(endExpr);
        continue;
      }
      evaluatedArgs.push(this.evalExpression(arg, variables));
    }

    return { evaluatedArgs, sep, end };
  }

  private evalExpression(expr: string, variables: Record<string, unknown>): unknown {
    expr = expr.trim();
    if (!expr) return '';

    // Handle strings, e.g., "Hello" or 'World'
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.substring(1, expr.length - 1);
    }

    // Numeric constants
    if (/^\d+(\.\d+)?$/.test(expr)) {
      return expr.includes('.') ? parseFloat(expr) : parseInt(expr, 10);
    }

    // Check if it is a variable name
    if (variables[expr] !== undefined) {
      return variables[expr];
    }

    // String Concatenation or simple addition with '+'
    if (expr.includes('+')) {
      const parts = expr.split('+');
      let isStringConcat = false;
      const vals = parts.map(p => {
        const val = this.evalExpression(p, variables);
        if (typeof val === 'string') isStringConcat = true;
        return val;
      });
      if (isStringConcat) {
        return vals.join('');
      } else {
        return vals.reduce((acc, curr) => Number(acc) + Number(curr), 0);
      }
    }

    // String Multiplication repetition with '*'
    if (expr.includes('*')) {
      const parts = expr.split('*');
      if (parts.length === 2) {
        const left = this.evalExpression(parts[0], variables);
        const right = this.evalExpression(parts[1], variables);
        if (typeof left === 'string' && typeof right === 'number') {
          return left.repeat(right);
        }
        if (typeof right === 'string' && typeof left === 'number') {
          return right.repeat(left);
        }
        return Number(left) * Number(right);
      }
    }

    // String length: len(var)
    if (expr.startsWith('len(') && expr.endsWith(')')) {
      const inner = expr.substring(4, expr.length - 1);
      const val = this.evalExpression(inner, variables);
      return typeof val === 'string' ? val.length : 0;
    }

    // Type query: type(var)
    if (expr.startsWith('type(') && expr.endsWith(')')) {
      const inner = expr.substring(5, expr.length - 1);
      const val = this.evalExpression(inner, variables);
      if (typeof val === 'number') {
        return Number.isInteger(val) ? "<class 'int'>" : "<class 'float'>";
      }
      return "<class 'str'>";
    }

    // Modulo % or Floor division //
    if (expr.includes('//')) {
      const parts = expr.split('//');
      if (parts.length === 2) {
        const left = Number(this.evalExpression(parts[0], variables));
        const right = Number(this.evalExpression(parts[1], variables));
        if (right === 0) throw new Error("ZeroDivisionError: integer division or modulo by zero");
        return Math.floor(left / right);
      }
    }

    if (expr.includes('%')) {
      const parts = expr.split('%');
      if (parts.length === 2) {
        const left = Number(this.evalExpression(parts[0], variables));
        const right = Number(this.evalExpression(parts[1], variables));
        if (right === 0) throw new Error("ZeroDivisionError: integer division or modulo by zero");
        return left % right;
      }
    }

    // Basic arithmetic operators (-, /)
    if (expr.includes('-')) {
      const parts = expr.split('-');
      if (parts.length === 2) {
        return Number(this.evalExpression(parts[0], variables)) - Number(this.evalExpression(parts[1], variables));
      }
    }

    if (expr.includes('/')) {
      const parts = expr.split('/');
      if (parts.length === 2) {
        const right = Number(this.evalExpression(parts[1], variables));
        if (right === 0) throw new Error("ZeroDivisionError: division by zero");
        return Number(this.evalExpression(parts[0], variables)) / right;
      }
    }

    return expr;
  }

  private isMathExpr(line: string): boolean {
    return /^[\d\s+\-*/%()//]+$/.test(line) && !line.includes('=');
  }

  // Generate an HTML code sandbox URL/source for client iframe previews
  generateHtmlPreview(html: string, css = '', js = ''): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>${css}</style>
        </head>
        <body>
          ${html}
          <script>
            // Capture console.log outputs
            const _log = console.log;
            console.log = (...args) => {
              _log(...args);
              window.parent.postMessage({ type: 'CONSOLE_LOG', text: args.join(' ') }, '*');
            };
            try {
              ${js}
            } catch (err) {
              console.error(err);
              window.parent.postMessage({ type: 'CONSOLE_ERROR', text: err.message }, '*');
            }
          </script>
        </body>
      </html>
    `;
  }
}
