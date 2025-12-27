'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { pharmacyAPI } from '@/lib/api/phase1';
import { toast } from 'sonner';

interface InventoryItem {
    id: string;
    drugName: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    manufacturer?: string;
    pricePerUnit?: number;
}

interface InventoryManagerProps {
    pharmacyId: string;
}

export function InventoryManager({ pharmacyId }: InventoryManagerProps) {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        drugName: '',
        batchNumber: '',
        quantity: '',
        expiryDate: '',
        manufacturer: '',
        pricePerUnit: '',
    });

    useEffect(() => {
        loadInventory();
    }, [pharmacyId]);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const response = await pharmacyAPI.getInventory(pharmacyId) as any;
            setInventory(response.data || []);
        } catch (error: any) {
            toast.error(error.message || 'Failed to load inventory');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await pharmacyAPI.updateInventory(pharmacyId, {
                drugName: formData.drugName,
                batchNumber: formData.batchNumber,
                quantity: parseInt(formData.quantity),
                expiryDate: formData.expiryDate,
                manufacturer: formData.manufacturer || undefined,
                pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : undefined,
            });

            toast.success('Inventory item added successfully');
            setDialogOpen(false);
            setFormData({
                drugName: '',
                batchNumber: '',
                quantity: '',
                expiryDate: '',
                manufacturer: '',
                pricePerUnit: '',
            });
            loadInventory();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add inventory item');
        }
    };

    const getExpiryStatus = (expiryDate: string) => {
        const now = new Date();
        const expiry = new Date(expiryDate);
        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
            return <Badge variant="destructive">Expired</Badge>;
        } else if (daysUntilExpiry <= 30) {
            return <Badge variant="destructive" className="bg-orange-600">Expiring Soon</Badge>;
        } else if (daysUntilExpiry <= 90) {
            return <Badge variant="secondary" className="bg-yellow-600 text-white">Warning</Badge>;
        }
        return <Badge variant="default">Valid</Badge>;
    };

    const getStockStatus = (quantity: number) => {
        if (quantity === 0) {
            return <Badge variant="destructive">Out of Stock</Badge>;
        } else if (quantity < 10) {
            return <Badge variant="destructive" className="bg-orange-600">Low Stock</Badge>;
        }
        return <Badge variant="default">In Stock</Badge>;
    };

    if (loading) {
        return <div>Loading inventory...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Drug Inventory</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage stock levels and expiry dates
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add Inventory Item</DialogTitle>
                            <DialogDescription>
                                Add a new drug to your pharmacy inventory
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="drugName">Drug Name *</Label>
                                    <Input
                                        id="drugName"
                                        value={formData.drugName}
                                        onChange={(e) => setFormData({ ...formData, drugName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="batchNumber">Batch Number *</Label>
                                    <Input
                                        id="batchNumber"
                                        value={formData.batchNumber}
                                        onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Quantity *</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            min="0"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="expiryDate">Expiry Date *</Label>
                                        <Input
                                            id="expiryDate"
                                            type="date"
                                            value={formData.expiryDate}
                                            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="manufacturer">Manufacturer</Label>
                                    <Input
                                        id="manufacturer"
                                        value={formData.manufacturer}
                                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pricePerUnit">Price per Unit (₹)</Label>
                                    <Input
                                        id="pricePerUnit"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.pricePerUnit}
                                        onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Add Item</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {inventory.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No inventory items found</p>
                            <p className="text-sm mt-2">Click "Add Item" to start managing your stock</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Drug Name</TableHead>
                                    <TableHead>Batch</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Expiry</TableHead>
                                    <TableHead>Manufacturer</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inventory.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.drugName}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{item.batchNumber}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {item.quantity}
                                                {getStockStatus(item.quantity)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                {new Date(item.expiryDate).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {item.manufacturer || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {item.pricePerUnit ? `₹${item.pricePerUnit.toFixed(2)}` : '-'}
                                        </TableCell>
                                        <TableCell>{getExpiryStatus(item.expiryDate)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
