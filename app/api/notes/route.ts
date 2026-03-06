import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const notes = await prisma.note.findMany({
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(notes);
    } catch (error) {
        console.error("Error fetching notes:", error);
        return NextResponse.json(
            { error: "Failed to fetch notes" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const { title, content } = await req.json();

        // Basic validation
        if (!title || !content) {
            return NextResponse.json(
                { error: "Title and content are required" },
                { status: 400 }
            );
        }

        const newNote = await prisma.note.create({
            data: {
                title,
                content
            }
        });

        return NextResponse.json(newNote, { status: 201 });
    } catch (error) {
        console.error("Error creating note:", error);
        return NextResponse.json(
            { error: "Failed to create note" },
            { status: 500 }
        );
    }
}