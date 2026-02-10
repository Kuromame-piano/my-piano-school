"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { encrypt } from "@/lib/auth";

export async function login(prevState: any, formData: FormData) {
    const password = formData.get("password") as string;

    if (password === process.env.SESSION_PASSWORD) {
        const session = await encrypt({ role: "admin" });
        const cookieStore = await cookies();

        cookieStore.set("session", session, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: "/",
        });

        redirect("/");
    } else {
        return { error: "パスワードが間違っています" };
    }
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    redirect("/login");
}
