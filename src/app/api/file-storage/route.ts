// API route for writing JSON files to the file system
// This allows the browser to actually write to users.json and reminders.json

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { ApiResponse } from "@/types/shared";

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const { filename, data } = await request.json();

    // Validate filename
    if (
      !filename ||
      (filename !== "users.json" && filename !== "reminders.json")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid filename",
        },
        { status: 400 }
      );
    }

    // Get the data directory path
    const dataDir = path.join(process.cwd(), "src", "data");
    const filePath = path.join(dataDir, filename);

    // Ensure data directory exists
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    // Write the file
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");

    console.log(`✅ Successfully wrote ${filename} to file system`);

    return NextResponse.json({
      success: true,
      message: `${filename} updated successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error writing file:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to write file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const url = new URL(request.url);
    const filename = url.searchParams.get("filename");

    if (
      !filename ||
      (filename !== "users.json" && filename !== "reminders.json")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid filename",
        },
        { status: 400 }
      );
    }

    const dataDir = path.join(process.cwd(), "src", "data");
    const filePath = path.join(dataDir, filename);

    try {
      const fileContent = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(fileContent);

      return NextResponse.json({
        success: true,
        data,
        lastModified: (await fs.stat(filePath)).mtime,
      });
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        return NextResponse.json(
          {
            success: false,
            error: "File not found",
          },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error reading file:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to read file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
