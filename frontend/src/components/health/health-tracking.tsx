'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, Activity, Droplet, Weight, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface VitalReading {
    id: string;
    type: 'blood_pressure' | 'heart_rate' | 'blood_sugar' | 'weight' | 'temperature';
    value: string;
    unit: string;
    timestamp: string;
}

interface VitalCardProps {
    title: string;
    icon: React.ElementType;
    currentValue: string;
    unit: string;
    status: 'normal' | 'warning' | 'critical';
    onAddReading: () => void;
}

export function VitalCard({ title, icon: Icon, currentValue, unit, status, onAddReading }: VitalCardProps) {
    const statusColors = {
        normal: 'text-green-600 bg-green-50',
        warning: 'text-yellow-600 bg-yellow-50',
        critical: 'text-red-600 bg-red-50',
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold">{currentValue}</div>
                    <div className="text-sm text-muted-foreground">{unit}</div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                    <div className={`text-xs px-2 py-1 rounded-full ${statusColors[status]}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </div>
                    <Button variant="ghost" size="sm" onClick={onAddReading}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

interface AddVitalDialogProps {
    type: string;
    onSave: (value: string) => void;
    onCancel: () => void;
}

export function AddVitalDialog({ type, onSave, onCancel }: AddVitalDialogProps) {
    const [value, setValue] = useState('');

    const vitalConfig: Record<string, { label: string; unit: string; placeholder: string }> = {
        blood_pressure: { label: 'Blood Pressure', unit: 'mmHg', placeholder: '120/80' },
        heart_rate: { label: 'Heart Rate', unit: 'bpm', placeholder: '72' },
        blood_sugar: { label: 'Blood Sugar', unit: 'mg/dL', placeholder: '100' },
        weight: { label: 'Weight', unit: 'kg', placeholder: '70' },
        temperature: { label: 'Body Temperature', unit: '°F', placeholder: '98.6' },
    };

    const config = vitalConfig[type] || vitalConfig.heart_rate;

    const handleSave = () => {
        if (!value) {
            toast.error('Please enter a value');
            return;
        }
        onSave(value);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="vital-value">{config.label}</Label>
                <div className="flex gap-2 items-center">
                    <Input
                        id="vital-value"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={config.placeholder}
                        className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground min-w-[60px]">{config.unit}</span>
                </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Normal Ranges:</strong></p>
                {type === 'blood_pressure' && <p>• Systolic: 90-120 mmHg • Diastolic: 60-80 mmHg</p>}
                {type === 'heart_rate' && <p>• Resting: 60-100 bpm</p>}
                {type === 'blood_sugar' && <p>• Fasting: 70-100 mg/dL • Post-meal: \u003c140 mg/dL</p>}
                {type === 'weight' && <p>• Varies by height and body composition</p>}
                {type === 'temperature' && <p>• Normal: 97-99°F (36.1-37.2°C)</p>}
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleSave}>
                    <Plus className="h-4 w-4 mr-2" />
                    Save Reading
                </Button>
            </div>
        </div>
    );
}

interface HealthGoal {
    id: string;
    title: string;
    target: string;
    current: string;
    progress: number;
    deadline: string;
}

interface HealthGoalsProps {
    goals: HealthGoal[];
    onAddGoal?: () => void;
}

export function HealthGoals({ goals, onAddGoal }: HealthGoalsProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Health Goals</CardTitle>
                        <CardDescription>Track your health and wellness objectives</CardDescription>
                    </div>
                    {onAddGoal && (
                        <Button onClick={onAddGoal} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Goal
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {goals.length === 0 ? (
                    <div className="text-center py-8">
                        <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No health goals set</p>
                        {onAddGoal && (
                            <Button onClick={onAddGoal} variant="outline" size="sm" className="mt-4">
                                <Plus className="h-4 w-4 mr-2" />
                                Set Your First Goal
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {goals.map((goal) => (
                            <div key={goal.id} className="border rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h4 className="font-medium">{goal.title}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Target: {goal.target} • Current: {goal.current}
                                        </p>
                                    </div>
                                    <div className="text-sm font-medium">{goal.progress}%</div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all"
                                        style={{ width: `${goal.progress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Deadline: {new Date(goal.deadline).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Sample health metrics chart component
export function HealthMetricsChart() {
    // Sample data for demonstration (7 days of readings)
    const sampleData = [
        { day: 'Mon', heartRate: 72, bloodPressure: 118, bloodSugar: 95 },
        { day: 'Tue', heartRate: 75, bloodPressure: 120, bloodSugar: 98 },
        { day: 'Wed', heartRate: 70, bloodPressure: 115, bloodSugar: 92 },
        { day: 'Thu', heartRate: 73, bloodPressure: 119, bloodSugar: 96 },
        { day: 'Fri', heartRate: 71, bloodPressure: 117, bloodSugar: 94 },
        { day: 'Sat', heartRate: 74, bloodPressure: 121, bloodSugar: 99 },
        { day: 'Sun', heartRate: 72, bloodPressure: 118, bloodSugar: 95 },
    ];

    const maxHeartRate = 100;
    const maxBloodPressure = 140;
    const maxBloodSugar = 120;

    const chartWidth = 600;
    const chartHeight = 200;
    const padding = 20;

    const createPath = (data: number[], max: number) => {
        const points = data.map((value, index) => {
            const x = padding + (index / (data.length - 1)) * (chartWidth - 2 * padding);
            const y = chartHeight - padding - ((value / max) * (chartHeight - 2 * padding));
            return `${x},${y}`;
        });
        return `M ${points.join(' L ')}`;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Health Trends</CardTitle>
                <CardDescription>View your health metrics over the past 7 days</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Legend */}
                    <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span>Heart Rate (bpm)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span>Blood Pressure (mmHg)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <span>Blood Sugar (mg/dL)</span>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                        <svg
                            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                            className="w-full h-64"
                            preserveAspectRatio="xMidYMid meet"
                        >
                            {/* Grid lines */}
                            {[0, 1, 2, 3, 4].map((i) => (
                                <line
                                    key={i}
                                    x1={padding}
                                    y1={padding + (i * (chartHeight - 2 * padding)) / 4}
                                    x2={chartWidth - padding}
                                    y2={padding + (i * (chartHeight - 2 * padding)) / 4}
                                    stroke="currentColor"
                                    strokeOpacity="0.1"
                                    strokeDasharray="4 4"
                                />
                            ))}

                            {/* Heart Rate Line */}
                            <path
                                d={createPath(sampleData.map(d => d.heartRate), maxHeartRate)}
                                fill="none"
                                stroke="rgb(59, 130, 246)"
                                strokeWidth="2"
                            />

                            {/* Blood Pressure Line */}
                            <path
                                d={createPath(sampleData.map(d => d.bloodPressure), maxBloodPressure)}
                                fill="none"
                                stroke="rgb(34, 197, 94)"
                                strokeWidth="2"
                            />

                            {/* Blood Sugar Line */}
                            <path
                                d={createPath(sampleData.map(d => d.bloodSugar), maxBloodSugar)}
                                fill="none"
                                stroke="rgb(168, 85, 247)"
                                strokeWidth="2"
                            />

                            {/* X-axis labels */}
                            {sampleData.map((d, i) => (
                                <text
                                    key={i}
                                    x={padding + (i / (sampleData.length - 1)) * (chartWidth - 2 * padding)}
                                    y={chartHeight - 5}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fill="currentColor"
                                    opacity="0.6"
                                >
                                    {d.day}
                                </text>
                            ))}
                        </svg>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        💡 Record your vitals daily to see personalized trends
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
