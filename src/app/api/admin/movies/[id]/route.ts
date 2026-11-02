import { NextRequest, NextResponse } from "next/server";
import { runSerializableTransaction } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const updates = await req.json();

  const updated = await runSerializableTransaction((db) => {
    const idx = db.movies.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    db.movies[idx] = { ...db.movies[idx], ...updates, id };
    return db.movies[idx];
  });

  if (!updated) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }
  return NextResponse.json({ movie: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const deleted = await runSerializableTransaction((db) => {
    const idx = db.movies.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    db.movies.splice(idx, 1);
    db.shows = db.shows.filter((s) => s.movieId !== id);
    return true;
  });

  if (!deleted) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
