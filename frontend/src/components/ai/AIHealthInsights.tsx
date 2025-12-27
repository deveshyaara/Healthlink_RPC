'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { chatApi } from '@/lib/api-client';

interface LabResult {
    testName: string;
    value: string;
    unit: string;
    normalRange: string;
    status: 'normal' | 'low' | 'high';
}

interface AIInsightsProps {
    labResults?: LabResult[];
    symptoms?: string[];
}

export function AIHealthInsights({ labResults = [], symptoms = [] }: AIInsightsProps) {
    const [insights, setInsights] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const analyzeResults = async () => {
        setLoading(true);
        try {
            // Create detailed prompt for AI
            const resultsText = labResults
                .map(r => `${r.testName}: ${r.value} ${r.unit} (Normal: ${r.normalRange}) - Status: ${r.status}`)
                .join('\n');

            const symptomsText = symptoms.length > 0 ? `\nSymptoms: ${symptoms.join(', ')}` : '';

            const prompt = `As a medical AI assistant, analyze these lab results and provide insights:\n\n${resultsText}${symptomsText}\n\nProvide:\n1. Summary of results\n2. What abnormalities mean\n3. Lifestyle recommendations\n4. When to see a doctor\n\nKeep it concise and actionable.`;

            const response = await chatApi.sendMessage(prompt);
            const aiText = response?.data?.response || response?.reply || response?.message || 'Unable to analyze results';
            setInsights(aiText);
        } catch (error) {
            setInsights('Error analyzing results. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'normal': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'low': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'normal': return <CheckCircle className="h-4 w-4" />;
            case 'low': return <TrendingUp className="h-4 w-4 rotate-180" />;
            case 'high': return <AlertTriangle className="h-4 w-4" />;
            default: return null;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Health Insights
                    <Badge className="ml-auto bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Powered by AI
                    </Badge>
                </CardTitle>
                <CardDescription>
                    Get AI-powered interpretation of your lab results
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Lab Results Display */}
                {labResults.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Lab Results:</h4>
                        {labResults.map((result, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">{result.testName}</span>
                                    <Badge className={getStatusColor(result.status)}>
                                        {getStatusIcon(result.status)}
                                        <span className="ml-1">{result.status.toUpperCase()}</span>
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <div>
                                        <span className="text-xs">Value:</span>
                                        <p className="font-medium">{result.value} {result.unit}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-xs">Normal Range:</span>
                                        <p className="font-medium">{result.normalRange}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* AI Analysis Button */}
                {labResults.length > 0 && !insights && (
                    <Button onClick={analyzeResults} disabled={loading} className="w-full">
                        <Brain className="mr-2 h-4 w-4" />
                        {loading ? 'Analyzing...' : 'Get AI Insights'}
                    </Button>
                )}

                {/* AI Insights Display */}
                {insights && (
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-start gap-3 mb-3">
                            <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                                    AI Analysis
                                </h4>
                                <div className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-line">
                                    {insights}
                                </div>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-purple-200 dark:border-purple-700">
                            <p className="text-xs text-purple-700 dark:text-purple-300">
                                ⚠️ This is AI-generated advice. Always consult with your healthcare provider for medical decisions.
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInsights(null)}
                            className="mt-2 w-full"
                        >
                            Analyze Again
                        </Button>
                    </div>
                )}

                {/* Empty State */}
                {labResults.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No lab results to analyze</p>
                        <p className="text-sm mt-1">Upload lab results to get AI-powered insights</p>
                    </div>
                )}
            </CardContent>
        </Card >
    );
}

// Quick symptom checker component
interface SymptomCheckerProps {
    onAnalyze?: (symptoms: string[], analysis: string) => void;
}

export function AISymptomChecker({ onAnalyze }: SymptomCheckerProps) {
    const [symptoms, setSymptoms] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const addSymptom = () => {
        if (input.trim() && !symptoms.includes(input.trim())) {
            setSymptoms([...symptoms, input.trim()]);
            setInput('');
        }
    };

    const removeSymptom = (symptom: string) => {
        setSymptoms(symptoms.filter(s => s !== symptom));
    };

    const analyzeSymptoms = async () => {
        if (symptoms.length === 0) return;

        setLoading(true);
        try {
            const prompt = `As a medical AI, analyze these symptoms: ${symptoms.join(', ')}.\n\nProvide:\n1. Possible causes (most common first)\n2. Severity assessment\n3. Home care recommendations\n4. When to seek immediate medical attention\n\nBe concise and clear.`;

            const response = await chatApi.sendMessage(prompt);
            const aiText = response?.data?.response || response?.reply || 'Unable to analyze symptoms';
            setAnalysis(aiText);
            onAnalyze?.(symptoms, aiText);
        } catch (error) {
            setAnalysis('Error analyzing symptoms. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    AI Symptom Checker
                </CardTitle>
                <CardDescription>
                    Describe your symptoms for AI-powered health guidance
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Input */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
                        placeholder="Enter a symptom (e.g., headache, fever)"
                        className="flex-1 px-3 py-2 border rounded-md"
                    />
                    <Button onClick={addSymptom}>Add</Button>
                </div>

                {/* Symptom List */}
                {symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {symptoms.map((symptom, index) => (
                            <Badge key={index} variant="secondary" className="px-3 py-1">
                                {symptom}
                                <button
                                    onClick={() => removeSymptom(symptom)}
                                    className="ml-2 hover:text-red-600"
                                >
                                    ×
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Analyze Button */}
                {symptoms.length > 0 && !analysis && (
                    <Button onClick={analyzeSymptoms} disabled={loading} className="w-full">
                        <Brain className="mr-2 h-4 w-4" />
                        {loading ? 'Analyzing...' : 'Analyze Symptoms'}
                    </Button>
                )}

                {/* Analysis */}
                {analysis && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-medium mb-2">AI Analysis:</h4>
                        <div className="text-sm whitespace-pre-line mb-3">{analysis}</div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setAnalysis(null); setSymptoms([]); }}
                            className="w-full"
                        >
                            Start New Analysis
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
