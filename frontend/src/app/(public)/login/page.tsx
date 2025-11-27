"use client";

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const { login, loading } = useAuth()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !password) {
            return
        }

        try {
            await login(email, password)
        } catch {
            // Error is handled by the auth context
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
            <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              
            </Link>
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline">Welcome Back</CardTitle>
                    <CardDescription>Log in to access your dashboard</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="Enter your email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                placeholder="Enter your password"
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                disabled={loading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <p className="text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="text-primary hover:underline font-medium">
                            Sign up here
                        </Link>
                    </p>
                    <div className="text-xs text-center text-muted-foreground">
                        <Lock className="inline h-3 w-3 mr-1" />
                        Secure login powered by government-grade encryption
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}

    