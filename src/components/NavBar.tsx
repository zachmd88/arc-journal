"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

export default function NavBar() {
    const { user } = useAuth();
    const pathname = usePathname();

    const firstName = user?.displayName ? user.displayName.split(' ')[0] : "Golfer";

    const navLinks = [
        { name: "Dashboard", href: "/" },
        { name: "Log Round", href: "/log/round" },
        { name: "Log Session", href: "/log/session" },
        { name: "AI Coach", href: "/coach" },
        { name: "Resources", href: "/resources" }
    ];

    return (
        <nav className="bg-zinc-900 border-b border-zinc-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 justify-between items-center">
                    <div className="flex items-center">
                        <Link href="/" className="text-2xl font-bold tracking-tight text-zinc-100 hover:text-white transition-colors">
                            Arc Journal
                        </Link>
                    </div>
                    <div className="flex items-center space-x-6 overflow-x-auto">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`text-sm font-medium whitespace-nowrap transition-colors ${
                                        isActive ? "text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                                    }`}
                                >
                                    {link.name}
                                </Link>
                            );
                        })}
                        <div className="ml-4 flex items-center pl-4 border-l border-zinc-800 gap-3">
                            <span className="text-sm font-medium text-zinc-300 hidden sm:block">
                                Hello, {firstName}
                            </span>
                            {user?.photoURL ? (
                                <Image
                                    className="rounded-full border border-zinc-700"
                                    src={user.photoURL}
                                    alt="Profile"
                                    width={36}
                                    height={36}
                                    unoptimized
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                    <span className="text-sm font-bold text-zinc-400">{firstName.charAt(0)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
