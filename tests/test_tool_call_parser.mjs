import assert from 'assert';

function extractInlineJsonToolCalls(text) {
  const calls = [];
  const validTools = new Set(['write_file', 'patch_file', 'run_command', 'read_file', 'list_files', 'finish_task']);
  
  let i = 0;
  while (i < text.length) {
    if (text[i] === '{') {
      let depth = 0;
      let inString = false;
      let escape = false;
      let start = i;
      let matched = false;

      for (let j = i; j < text.length; j++) {
        const ch = text[j];
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\' && inString) {
          escape = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              const candidate = text.slice(start, j + 1);
              try {
                const parsed = JSON.parse(candidate);
                const name = parsed.name || parsed.tool;
                if (name && validTools.has(name)) {
                  calls.push({
                    id: null,
                    name,
                    args: parsed.parameters || parsed.args || parsed
                  });
                  i = j;
                  matched = true;
                  break;
                }
              } catch {}
            }
          }
        }
      }
      if (matched) {
        i++;
        continue;
      }
    }
    i++;
  }
  return calls;
}

const userText = `It seems like the compiler was not found. To fix this, we need to add the compiler path to the system environment variables.Here's the corrected code:{"name": "write_file", "parameters": {"path": "hello.c", "content": "#include <stdio.h>\\nint main() {\\n    printf(\\"Hello, World!\\\\n\\");\\n    return 0;\\n}"}}; {"name": "run_command", "parameters": {"command": "gcc -O2 hello.c -o hello.exe"}}; {"name": "run_command", "parameters": {"command": ".\\\\hello.exe"}}`;

const calls = extractInlineJsonToolCalls(userText);
console.log('Extracted calls:', calls.length);
assert.strictEqual(calls.length, 3);
assert.strictEqual(calls[0].name, 'write_file');
assert.strictEqual(calls[0].args.path, 'hello.c');
assert.strictEqual(calls[1].name, 'run_command');
assert.strictEqual(calls[1].args.command, 'gcc -O2 hello.c -o hello.exe');
assert.strictEqual(calls[2].name, 'run_command');
assert.strictEqual(calls[2].args.command, '.\\hello.exe');
console.log('✅ Inline JSON tool call parsing passed!');
