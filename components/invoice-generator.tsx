'use client'

import { useState, useRef} from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Calendar, Plus, Trash2, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { storage } from '@/app/firebase';
import { ref, uploadBytes } from "firebase/storage";

interface LineItem {
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  sgst: number;
  cgst: number;
  cess: number;
  amount: number;
}

export function InvoiceGenerator() {
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', hsn: '', quantity: 1, rate: 0, sgst: 0, cgst: 0, cess: 0, amount: 0 }
  ]);
  const [theme, setTheme] = useState('black');
  const [logo, setLogo] = useState<File | null>(null); // State for logo file
  const [logoURL, setLogoURL] = useState<string | null>(null); // State for logo URL
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', hsn: '', quantity: 1, rate: 0, sgst: 0, cgst: 0, cess: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };

    // Recalculate amount and taxes
    const quantity = Number(newLineItems[index].quantity);
    const rate = Number(newLineItems[index].rate);
    const subtotal = quantity * rate;
    const sgst = subtotal * 0.06; // 6% SGST
    const cgst = subtotal * 0.06; // 6% CGST

    newLineItems[index].sgst = sgst;
    newLineItems[index].cgst = cgst;
    newLineItems[index].amount = subtotal + sgst + cgst + Number(newLineItems[index].cess);

    setLineItems(newLineItems);
  };

  const calculateTotal = () => {
    return lineItems.reduce((total, item) => total + item.amount, 0);
  };
  const getPDFThemeColors = (theme: string) => {
    switch (theme) {
      case 'orange':
        return { textColor: '#E65100', borderColor: '#FFB74D', bgColor: '#FFF3E0' }; // Light orange background
      case 'blue':
        return { textColor: '#0D47A1', borderColor: '#64B5F6', bgColor: '#E3F2FD' }; // Light blue background
      case 'green':
        return { textColor: '#1B5E20', borderColor: '#81C784', bgColor: '#E8F5E9' }; // Light green background
      case 'red':
        return { textColor: '#B71C1C', borderColor: '#E57373', bgColor: '#FFEBEE' }; // Light red background
      default: // black
        return { textColor: '#212121', borderColor: '#BDBDBD', bgColor: '#FFFFFF' }; // White background
    }
  };
  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    const { textColor, borderColor, bgColor  } = getPDFThemeColors(theme);

    doc.setFillColor(bgColor);
    doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');

  
    // Add logo if it exists
    if (logoURL) {
      doc.addImage(logoURL, 'JPEG', 10, 10, 40, 40); // Adjust the dimensions as needed
    }
  
    // Title
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textColor); // Apply theme color to title
    doc.text("TAX INVOICE", 105, 20, { align: "center" });
  
    // Company and Client Details
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor); // Apply theme color to text

    doc.text("Your Company Name", 10, 50);
    doc.text("Company's GSTIN", 10, 60);
    doc.text("Company's Address", 10, 70);
  
    doc.text("Bill To: Client's Company", 140, 50);
    doc.text("Client's GSTIN", 140, 60);
    doc.text("Client's Address", 140, 70);
  
    // Invoice Details
    doc.text("Invoice#: INV-001", 10, 90);
    doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 10, 100);
    doc.text("Due Date: due date", 140, 90);
  
    // Line Items Table Headers
    const startY = 110;
    const columnHeaders = ["Item Description", "HSN/SAC", "Qty", "Rate", "SGST", "CGST", "Cess", "Amount"];
    const columnWidths = [40, 30, 20, 30, 20, 20, 20, 30];
  
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textColor); // Apply theme color to headers
    columnHeaders.forEach((header, i) => {
      doc.text(header, 10 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), startY);
    });
  
    // Line Items Data
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor); // Apply theme color to line items
    lineItems.forEach((item, index) => {
      const y = startY + (index + 1) * 10;
      doc.text(item.description, 10, y);
      doc.text(item.hsn, 10 + columnWidths[0], y);
      doc.text(item.quantity.toString(), 10 + columnWidths[0] + columnWidths[1], y);
      doc.text(Number(item.rate).toFixed(2), 10 + columnWidths[0] + columnWidths[1] + columnWidths[2], y);
      doc.text(item.sgst.toFixed(2), 10 + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], y);
      doc.text(item.cgst.toFixed(2), 10 + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4], y);
      doc.text(item.cess.toFixed(2), 10 + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + columnWidths[5], y);
      doc.text(item.amount.toFixed(2), 10 + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + columnWidths[5] + columnWidths[6], y);
    });
  
    // Totals Section
    const totalY = startY + (lineItems.length + 2) * 10;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textColor); // Apply theme color to total
    doc.text(`Total: Rs. ${calculateTotal().toFixed(2)}`, 140, totalY);

    // Add Footer
    const footerY = totalY + 20;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor); // Apply theme color to footer
    doc.setFontSize(10);
    doc.text("Thank you for your business!", 105, footerY, { align: "center" });
  
    doc.save('invoice.pdf');
  };
  

const handleSaveOnline = async () => {
    const doc = new jsPDF();
    
    // Add logo if it exists
    if (logoURL) {
        doc.addImage(logoURL, 'JPEG', 10, 10, 40, 40); // Adjust the dimensions as needed
    }
    
    // Title
    doc.setFontSize(20);
    doc.text("Invoice", 60, 20); // Centered title
    doc.setFontSize(12);

    // Add Invoice Details
    doc.text(`Total:` + calculateTotal().toFixed(2), 10, 60);

    // Create a table for line items
    const startY = 70;
    const columnHeaders = ["Item Description", "HSN/SAC", "Qty", "Rate", "SGST", "CGST", "Cess", "Amount"];
    const columnWidths = [40, 30, 30, 30, 20, 20, 20, 30];

    // Draw headers
    columnHeaders.forEach((header, i) => {
        doc.text(header, 10 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), startY);
    });

    // Draw line items
    lineItems.forEach((item, index) => {
        const y = startY + (index + 1) * 10;
        doc.text(item.description, 10, y);
        doc.text(item.hsn, 10 + columnWidths[0], y);
        doc.text(item.quantity.toString(), 10 + columnWidths[0] + columnWidths[1], y);
        // Check if item.rate is a number and valid, otherwise default to 0.00

// Add the rate to the PDF at the correct position
doc.text((Number(item.rate) || 0).toFixed(2), 10 + columnWidths[0] + columnWidths[1] + columnWidths[2], y);


        doc.text(item.sgst.toFixed(2), 10 + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], y);
        doc.text(item.cgst.toFixed(2), 10 + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4], y);
        doc.text(item.cess.toFixed(2), 10 + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + columnWidths[5], y);
        doc.text(item.amount.toFixed(2), 10 + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + columnWidths[5] + columnWidths[6], y);
    });

    // Save the PDF to Firebase Storage
    const pdfBlob = doc.output('blob');
    const storageRef = ref(storage, `invoices/invoice_${Date.now()}.pdf`);

    try {
        const snapshot = await uploadBytes(storageRef, pdfBlob);
        console.log("Uploaded a PDF file successfully!", snapshot);
        alert('Invoice saved successfully!');
    } catch (error) {
        console.error("Error uploading the file: ", error);
        alert('Failed to save invoice. Please try again.');
    }
};

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("File size should not exceed 1MB");
        return;
      }
      setLogo(file);
      const url = URL.createObjectURL(file);
      setLogoURL(url);
    }
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'orange':
        return { backgroundColor: '#FFF3E0', color: '#E65100', borderColor: '#FFB74D' };
      case 'blue':
        return { backgroundColor: '#E3F2FD', color: '#0D47A1', borderColor: '#64B5F6' };
      case 'green':
        return { backgroundColor: '#E8F5E9', color: '#1B5E20', borderColor: '#81C784' };
      case 'red':
        return { backgroundColor: '#FFEBEE', color: '#B71C1C', borderColor: '#E57373' };
      default: // black
        return { backgroundColor: '#FAFAFA', color: '#212121', borderColor: '#BDBDBD' };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-6xl mx-auto" style={{
        backgroundColor: themeStyles.backgroundColor,
        borderColor: themeStyles.borderColor,
      }}>
        <CardHeader>
          <CardTitle className="text-2xl font-bold" style={{ color: themeStyles.color }}>Free GST Invoice Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                ref={fileInputRef}
              />
              <Button
                variant="outline"
                className="w-32 h-32"
                style={{ borderColor: themeStyles.borderColor }}
                onClick={() => fileInputRef.current?.click()}
              >
                {logoURL ? (
                  <img src={logoURL} alt="Company Logo" className="w-full h-full object-contain" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 mr-2" style={{ color: themeStyles.color }} />
                    <span style={{ color: themeStyles.color }}>Upload Logo</span>
                  </>
                )}
              </Button>
              <div className="text-sm" style={{ color: themeStyles.color }}>
                240 x 240 pixels @ 72 DPI,<br />
                Maximum size of 1MB.
              </div>
            </div>
            <div className="text-4xl font-bold" style={{ color: themeStyles.color }}>TAX INVOICE</div>
          </div>

          {logoURL && <img src={logoURL} alt="Uploaded Logo" className="mt-4 w-32 h-32 object-cover" />} {/* Display uploaded logo */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Your Company</Label>
              <Input id="company" placeholder="Your Company Name" />
              <Input id="gstin" placeholder="Company's GSTIN" />
              <Textarea placeholder="Company's Address" />
              <Input id="city" placeholder="City" />
              <Select defaultValue="India">
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="India">India</SelectItem>
                  {/* Add more countries as needed */}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Bill To</Label>
              <Input id="client" placeholder="Your Client's Company" />
              <Input id="client-gstin" placeholder="Client's GSTIN" />
              <Textarea placeholder="Client's Address" />
              <Input id="client-city" placeholder="City" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-number">Invoice#</Label>
              <Input id="invoice-number" placeholder="INV-001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-date">Invoice Date</Label>
              <div className="relative">
                <Input id="invoice-date" type="date" />
                <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date">Due Date</Label>
              <div className="relative">
                <Input id="due-date" type="date" />
                <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-500" />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Line Items</Label>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Item Description</TableHead>
                    <TableHead>HSN/SAC</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>SGST</TableHead>
                    <TableHead>CGST</TableHead>
                    <TableHead>Cess</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="py-2">
                        <Input 
                          placeholder="Enter item name/description"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input 
                          placeholder="HSN/SAC"
                          value={item.hsn}
                          onChange={(e) => updateLineItem(index, 'hsn', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input 
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input 
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateLineItem(index, 'rate', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="py-2">{item.sgst.toFixed(2)}</TableCell>
                      <TableCell className="py-2">{item.cgst.toFixed(2)}</TableCell>
                      <TableCell className="py-2">
                        <Input 
                          type="number"
                          value={item.cess}
                          onChange={(e) => updateLineItem(index, 'cess', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="py-2">{item.amount.toFixed(2)}</TableCell>
                      <TableCell className="py-2">
                        <Button variant="outline" size="sm" onClick={() => removeLineItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" onClick={addLineItem} className="mt-2">
              <Plus className="h-4 w-4 mr-2" /> Add Line Item
            </Button>
          </div>

          <div className="flex justify-end">
          <div className="w-64 space-y-2">
  <div className="flex justify-between" style={{ color: themeStyles.color }}>
    <span>Subtotal:</span>
    <span>₹{calculateTotal().toFixed(2)}</span>
  </div>
  <div className="flex justify-between" style={{ color: themeStyles.color }}>
    <span>SGST (6%):</span>
    <span>₹{(calculateTotal() * 0.06).toFixed(2)}</span>
  </div>
  <div className="flex justify-between" style={{ color: themeStyles.color }}>
    <span>CGST (6%):</span>
    <span>₹{(calculateTotal() * 0.06).toFixed(2)}</span>
  </div>
  <div className="flex justify-between font-bold" style={{ color: themeStyles.color }}>
    <span>Total:</span>
    <span>₹{(calculateTotal() * 1.12).toFixed(2)}</span>
  </div>
</div>

          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="It was great doing business with you." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea id="terms" placeholder="Please make the payment by the due date." />
          </div>

        </CardContent>
        <CardFooter className="flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className={`w-6 h-6 rounded-full ${theme === 'black' ? 'ring-2 ring-primary' : ''}`} 
              style={{backgroundColor: 'black'}} 
              onClick={() => setTheme('black')}
            />
            <Button 
              variant="outline" 
              className={`w-6 h-6 rounded-full ${theme === 'orange' ? 'ring-2 ring-primary' : ''}`} 
              style={{backgroundColor: 'orange'}} 
              onClick={() => setTheme('orange')}
            />
            <Button 
              variant="outline" 
              className={`w-6 h-6 rounded-full ${theme === 'blue' ? 'ring-2 ring-primary' : ''}`} 
              style={{backgroundColor: 'blue'}} 
              onClick={() => setTheme('blue')}
            />
            <Button 
              variant="outline" 
              className={`w-6 h-6 rounded-full ${theme === 'green' ? 'ring-2 ring-primary' : ''}`} 
              style={{backgroundColor: 'green'}} 
              onClick={() => setTheme('green')}
            />
            <Button 
              variant="outline" 
              className={`w-6 h-6 rounded-full ${theme === 'red' ? 'ring-2 ring-primary' : ''}`} 
              style={{backgroundColor: 'red'}} 
              onClick={() => setTheme('red')}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              style={{ borderColor: themeStyles.borderColor, color: themeStyles.color }} 
              onClick={handleDownloadPDF} // Link the function to this button
            >
              Download/Print
            </Button>           
            <Button 
              style={{ backgroundColor: themeStyles.color, color: themeStyles.backgroundColor }} 
              onClick={handleSaveOnline} // Link the function here
            >
              Save online
            </Button>
          </div>
        </CardFooter>
      </Card>
      <div className="mt-4 text-center text-sm text-gray-500">
        Powered by <FileText className="inline h-4 w-4" /> Zoho Invoice
        <br />
        100% Free Invoicing Solution
      </div>
    </div>
  )
}
