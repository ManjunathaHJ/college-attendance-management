
import { NextResponse } from "next/server";
import pool from "@/lib/postgres";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    // Test PostgreSQL
    const pgResult = await pool.query("SELECT NOW()");

    // Test MongoDB
    const client = await clientPromise;
    const mongoResult = await client
      .db(process.env.MONGODB_DATABASE)
      .command({ ping: 1 });

    return NextResponse.json({
      success: true,
      message: "Both databases connected successfully",
      postgresql: {
        connected: true,
        time: pgResult.rows[0].now,
      },
      mongodb: {
        connected: mongoResult.ok === 1,
      },
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
}
