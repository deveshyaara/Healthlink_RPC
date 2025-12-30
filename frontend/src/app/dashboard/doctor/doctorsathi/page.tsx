'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Sparkles, RefreshCw, Zap, Brain, Activity, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { doctorsathiApi } from '@/lib/api-client';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    actions?: string[];
    timestamp: Date;
}

const EXAMPLE_PROMPTS = [
    {
        icon: '📅',
        title: 'Schedule Appointment',
        prompt: 'Schedule an appointment for Rajesh Kumar tomorrow at 2 PM',
    },
    {
        icon: '💊',
        title: 'Create Prescription',
        prompt: 'Write prescription for patient Priya Sharma with Amoxicillin 500mg',
    },
    {
        icon: '🔬',
        title: 'Order Lab Test',
        prompt: 'Order CBC test for Amit Patel, mark as urgent',
    },
    {
        icon: '📋',
        title: 'View Appointments',
        prompt: 'Show me all pending appointments for this week',
    },
];

export default function DoctorSathiPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const currentMessage = input;
        setInput('');
        setIsLoading(true);
        setIsTyping(true);

        try {
            // Call API using the proper apiClient
            const data = await doctorsathiApi.chat(currentMessage);

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
            toast.success('Response received!');
        } catch (error: any) {
            console.error('DoctorSathi error:', error);
            toast.error(error.message || 'Failed to process request');

            // Add error message to chat
            const errorMessage: Message = {
                role: 'assistant',
                content: "I apologize, but I'm having trouble processing your request right now. Please try again or contact support if this persists.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setIsTyping(false);
        }
    };

    const handleExampleClick = (prompt: string) => {
        setInput(prompt);
        inputRef.current?.focus();
    };

    const handleClearChat = () => {
        setMessages([]);
        toast.success('Chat cleared');
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
            </div>

            {/* Floating Particles */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-blue-400/30 rounded-full"
                        initial={{
                            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
                        }}
                        animate={{
                            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
                        }}
                        transition={{
                            duration: Math.random() * 10 + 10,
                            repeat: Infinity,
                            repeatType: 'reverse',
                        }}
                    />
                ))}
            </div>

            {/* Main Content */}
            <div className="relative z-10 container mx-auto p-6 max-w-6xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 360],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    repeatType: 'reverse',
                                }}
                                className="relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-75" />
                                <Brain className="relative h-12 w-12 text-white" />
                            </motion.div>
                            <div>
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                                    DoctorSathi AI
                                </h1>
                                <p className="text-slate-400 mt-1">
                                    Your Intelligent Medical Workflow Automation Assistant
                                </p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl px-4 py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-green-400" />
                                    <span className="text-xs text-slate-300">Active</span>
                                </div>
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl px-4 py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-blue-400" />
                                    <span className="text-xs text-slate-300">{messages.length} Messages</span>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                {/* Chat Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                    style={{
                        boxShadow: '0 0 60px rgba(59, 130, 246, 0.3)',
                    }}
                >
                    <div className="h-[calc(100vh-16rem)] flex flex-col">
                        {/* Messages Area */}
                        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                            {messages.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="h-full flex flex-col items-center justify-center"
                                >
                                    {/* Welcome Animation */}
                                    <motion.div
                                        animate={{
                                            y: [0, -10, 0],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                        }}
                                        className="mb-8"
                                    >
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-2xl opacity-50" />
                                            <Sparkles className="relative h-24 w-24 text-blue-400" />
                                        </div>
                                    </motion.div>

                                    <h2 className="text-3xl font-bold text-white mb-3">
                                        Welcome to DoctorSathi
                                    </h2>
                                    <p className="text-slate-400 text-center max-w-md mb-8">
                                        Your AI-powered medical assistant. Automate appointments, prescriptions, lab
                                        tests, and more with simple commands.
                                    </p>

                                    {/* Example Prompts */}
                                    <div className="grid grid-cols-2 gap-4 w-full max-w-3xl mt-8">
                                        {EXAMPLE_PROMPTS.map((example, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                whileHover={{ scale: 1.05, y: -5 }}
                                                onClick={() => handleExampleClick(example.prompt)}
                                                className="cursor-pointer backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-4 hover:border-blue-400/50 transition-all"
                                            >
                                                <div className="text-3xl mb-2">{example.icon}</div>
                                                <h3 className="text-white font-semibold mb-1">{example.title}</h3>
                                                <p className="text-sm text-slate-400">{example.prompt}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : (
                                <AnimatePresence>
                                    {messages.map((msg, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                                                }`}
                                        >
                                            <div
                                                className={`max-w-[75%] rounded-2xl p-4 ${msg.role === 'user'
                                                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/50'
                                                    : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white'
                                                    }`}
                                            >
                                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                                    {msg.content}
                                                </p>

                                                {msg.actions && msg.actions.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="mt-4 pt-4 border-t border-white/20"
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Zap className="h-3 w-3 text-yellow-400" />
                                                            <span className="text-xs font-semibold">Actions Completed:</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {msg.actions.map((action, i) => (
                                                                <motion.div
                                                                    key={i}
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    transition={{ delay: i * 0.1 }}
                                                                >
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="bg-white/20 text-white border-white/30"
                                                                    >
                                                                        ✓ {action}
                                                                    </Badge>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}

                                                <p className="text-xs opacity-60 mt-3">
                                                    {msg.timestamp.toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}

                            {/* Typing Indicator */}
                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start"
                                >
                                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                                        <div className="flex gap-2">
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 0.6, repeat: Infinity }}
                                                className="w-2 h-2 bg-blue-400 rounded-full"
                                            />
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                                className="w-2 h-2 bg-purple-400 rounded-full"
                                            />
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                                className="w-2 h-2 bg-cyan-400 rounded-full"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="border-t border-white/10 p-4 backdrop-blur-xl bg-white/5">
                            <div className="flex gap-3">
                                <Textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Type your instruction... (e.g., 'Schedule appointment for John tomorrow at 3 PM')"
                                    className="min-h-[70px] resize-none bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400 rounded-xl"
                                    disabled={isLoading}
                                />
                                <div className="flex flex-col gap-2">
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button
                                            onClick={handleSend}
                                            disabled={isLoading || !input.trim()}
                                            size="lg"
                                            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 rounded-xl h-[70px] px-6"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Send className="h-5 w-5 mr-2" />
                                                    Send
                                                </>
                                            )}
                                        </Button>
                                    </motion.div>
                                    {messages.length > 0 && (
                                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                            <Button
                                                onClick={handleClearChat}
                                                variant="outline"
                                                size="sm"
                                                className="bg-white/5 border-white/20 text-white hover:bg-white/10 rounded-xl"
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                                <Sparkles className="h-3 w-3" />
                                Press Enter to send, Shift+Enter for new line • Powered by AI
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
