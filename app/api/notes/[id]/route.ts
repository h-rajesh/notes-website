import prisma from "@/lib/db";
import { NextResponse } from "next/server";



export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {

    try{
        const { title, content } = await req.json();
        const resolvedParams = await params;
    
        if (!resolvedParams.id) {
            return NextResponse.json({msg:"Note ID not found"},{status:400})
        }
    
        const updatedNote = await prisma.note.update({
            where: { id: parseInt(resolvedParams.id, 10) },
            data: {
                title,
                content
            }
        })
        return NextResponse.json(updatedNote)
    } catch(err){
        return NextResponse.json({msg:"Internal server error"}, {status:500})
    }
    }

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    
    if (!resolvedParams.id) {
        return NextResponse.json({msg:"Note ID not found"},{status:400})
    }   

    const deletedNote = await prisma.note.delete({
        where:{id:parseInt(resolvedParams.id, 10)}
    })
    return NextResponse.json(deletedNote)
}