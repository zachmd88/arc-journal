
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { context, stats } = body;

        // Construct the question context from the frontend data
        const question = `
        Recent Usage: ${JSON.stringify(stats)}
        User Context: ${context || "None provided"}
        `;

        // Use absolute path to run.py to avoid CWD issues in Next.js
        // C:\Users\zachd\OneDrive\Desktop\Arc Journal Golf Training App\.agent\skills\notebooklm\scripts\run.py
        const runScriptPath = 'C:\\Users\\zachd\\OneDrive\\Desktop\\Arc Journal Golf Training App\\.agent\\skills\\notebooklm\\scripts\\run.py';
        const targetScript = 'query_notebook_json.py';

        console.log("Run Script Path:", runScriptPath);

        // Command: python "C:\...\run.py" query_notebook_json.py ...
        const command = `set PYTHONIOENCODING=utf-8 && python "${runScriptPath}" ${targetScript} --question "${question.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;

        console.log("Executing Command:", command);
        const { stdout, stderr } = await execAsync(command);

        if (stderr) {
            console.error("Python Stderr:", stderr);
            // Some libraries print to stderr even on success, so we don't necessarily fail here
            // unless stdout is empty
        }

        try {
            const data = JSON.parse(stdout.trim());
            return NextResponse.json(data);
        } catch (e) {
            console.error("Failed to parse JSON output:", stdout);
            return NextResponse.json(
                { error: "Failed to parse NotebookLM response", raw: stdout },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
