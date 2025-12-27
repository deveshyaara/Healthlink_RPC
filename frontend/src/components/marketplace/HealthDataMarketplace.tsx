'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Database, DollarSign, Shield, TrendingUp, Info, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface DataListing {
    id: string;
    dataType: string;
    recordCount: number;
    pricePerRecord: number;
    anonymized: boolean;
    status: 'active' | 'sold' | 'pending';
    earnings: number;
}

export function HealthDataMarketplace() {
    const [listings, setListings] = useState<DataListing[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        dataType: 'lab_results',
        recordCount: 5,
        pricePerRecord: 10,
        anonymized: true,
    });

    const totalEarnings = listings.reduce((sum, listing) => sum + listing.earnings, 0);

    const createListing = async () => {
        // Validate
        if (formData.recordCount < 1 || formData.pricePerRecord < 1) {
            toast.error('Please enter valid values');
            return;
        }

        if (!formData.anonymized) {
            toast.error('Data must be anonymized for marketplace');
            return;
        }

        // Create new listing
        const newListing: DataListing = {
            id: `DATA-${Date.now()}`,
            ...formData,
            status: 'active',
            earnings: 0,
        };

        setListings([...listings, newListing]);
        setShowCreateForm(false);
        toast.success('Data listing created successfully! 🎉');

        // Reset form
        setFormData({
            dataType: 'lab_results',
            recordCount: 5,
            pricePerRecord: 10,
            anonymized: true,
        });
    };

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card className="border-2 border-purple-200 dark:border-purple-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-6 w-6 text-purple-600" />
                        Health Data Marketplace
                        <Badge className="ml-auto bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                            NOVEL
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Monetize your anonymized health data for medical research while maintaining privacy
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <DollarSign className="h-8 w-8 text-green-600 mb-2" />
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                ${totalEarnings}
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">Total Earnings</p>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <TrendingUp className="h-8 w-8 text-blue-600 mb-2" />
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                {listings.filter(l => l.status === 'active').length}
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">Active Listings</p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <Shield className="h-8 w-8 text-purple-600 mb-2" />
                            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">100%</p>
                            <p className="text-sm text-purple-700 dark:text-purple-300">Privacy Protected</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* How It Works */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        How It Works
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 text-sm">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                                1
                            </div>
                            <div>
                                <p className="font-medium">Anonymize Your Data</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    All personal identifiers are automatically removed using advanced encryption
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                                2
                            </div>
                            <div>
                                <p className="font-medium">Set Your Price</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Choose how much you want to earn per record sold to researchers
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                                3
                            </div>
                            <div>
                                <p className="font-medium">Blockchain-Verified Payment</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Smart contracts ensure automatic, secure payment when data is purchased
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Create Listing */}
            {!showCreateForm ? (
                <Button onClick={() => setShowCreateForm(true)} className="w-full" size="lg">
                    <Database className="mr-2 h-5 w-5" />
                    Create New Data Listing
                </Button>
            ) : (
                <Card className="border-purple-200 dark:border-purple-800">
                    <CardHeader>
                        <CardTitle>Create Data Listing</CardTitle>
                        <CardDescription>
                            List your anonymized health data for research purposes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Data Type</Label>
                            <select
                                value={formData.dataType}
                                onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="lab_results">Lab Results</option>
                                <option value="vital_signs">Vital Signs</option>
                                <option value="medical_history">Medical History</option>
                                <option value="imaging_data">Imaging Data</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label>Number of Records</Label>
                            <Input
                                type="number"
                                min="1"
                                value={formData.recordCount}
                                onChange={(e) => setFormData({ ...formData, recordCount: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Price per Record ($)</Label>
                            <Input
                                type="number"
                                min="1"
                                value={formData.pricePerRecord}
                                onChange={(e) => setFormData({ ...formData, pricePerRecord: parseInt(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-gray-500">
                                Total potential earnings: ${formData.recordCount * formData.pricePerRecord}
                            </p>
                        </div>

                        <div className="flex items-center space-x-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <Switch
                                id="anonymized"
                                checked={formData.anonymized}
                                onCheckedChange={(checked) => setFormData({ ...formData, anonymized: checked })}
                                disabled
                            />
                            <Label htmlFor="anonymized" className="flex-1">
                                <div>
                                    <p className="font-medium">Full Anonymization (Required)</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        All personal identifiers will be removed before listing
                                    </p>
                                </div>
                            </Label>
                            <Shield className="h-5 w-5 text-yellow-600" />
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={createListing} className="flex-1">
                                Create Listing
                            </Button>
                            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Active Listings */}
            {listings.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Your Listings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {listings.map((listing) => (
                                <div key={listing.id} className="p-4 border rounded-lg">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-medium">{listing.dataType.replace('_', ' ').toUpperCase()}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {listing.recordCount} records @ ${listing.pricePerRecord} each
                                            </p>
                                        </div>
                                        <Badge
                                            className={
                                                listing.status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : listing.status === 'sold'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                            }
                                        >
                                            {listing.status}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">ID:</span>
                                            <p className="font-mono text-xs">{listing.id}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Earnings:</span>
                                            <p className="font-medium">${listing.earnings}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Privacy:</span>
                                            <p className="flex items-center gap-1 text-green-600">
                                                <Shield className="h-3 w-3" />
                                                Protected
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Research Impact */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Your Impact on Medical Research
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                        By sharing your anonymized health data, you're contributing to cutting-edge medical research
                        that helps discover new treatments and improve healthcare for everyone.
                    </p>
                    <Button variant="outline" className="w-full">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Learn More About Data Privacy
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
