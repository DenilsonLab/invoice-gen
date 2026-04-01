import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { InvoiceData, InvoiceBlock, InvoiceSettings } from '../types';
import { initialInvoiceData, initialLayout, initialSettings } from '../constants';
import { useAuth } from './AuthContext';

interface BuilderContextType {
  data: InvoiceData;
  setData: React.Dispatch<React.SetStateAction<InvoiceData>>;
  layout: InvoiceBlock[];
  setLayout: React.Dispatch<React.SetStateAction<InvoiceBlock[]>>;
  settings: InvoiceSettings;
  setSettings: React.Dispatch<React.SetStateAction<InvoiceSettings>>;
  selectedBlockId: string | null;
  setSelectedBlockId: React.Dispatch<React.SetStateAction<string | null>>;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

export function BuilderProvider({ children }: { children: React.ReactNode }) {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<InvoiceData>(initialInvoiceData);
  const [layout, setLayout] = useState<InvoiceBlock[]>(initialLayout);
  const [settings, setSettings] = useState<InvoiceSettings>(initialSettings);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (!id && user) {
      // It's a new invoice, let's set the user's data and calculate the next invoice number
      const fetchInitialData = async () => {
        try {
          const res = await fetch('/api/invoices');
          let nextInvoiceNumber = 'INV-0001';

          if (res.ok) {
            const invoices = await res.json();
            if (invoices.length > 0) {
              // Find the latest invoice number
              const latestInvoice = invoices[0]; // Assuming they are sorted by updatedAt DESC
              const lastNumber = latestInvoice.data.invoiceNumber;

              if (lastNumber) {
                // Extract prefix and number
                const match = lastNumber.match(/^(.*?)(\d+)$/);
                if (match) {
                  const prefix = match[1] || 'INV-';
                  const numStr = match[2];
                  const nextNum = parseInt(numStr, 10) + 1;
                  nextInvoiceNumber = `${prefix}${nextNum.toString().padStart(numStr.length, '0')}`;
                } else {
                  nextInvoiceNumber = `${lastNumber}-1`;
                }
              }
            }
          }

          setData(prev => ({
            ...prev,
            companyName: user.companyName || '',
            companyEmail: user.companyEmail || '',
            companyPhone: user.companyPhone || '',
            companyAddress: user.companyAddress || '',
            bankAddress: user.bankAddress || '',
            invoiceNumber: nextInvoiceNumber,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          }));
        } catch (error) {
          console.error('Failed to fetch initial data', error);
        }
      };

      fetchInitialData();
    }
  }, [id, user]);

  return (
    <BuilderContext.Provider value={{
      data, setData,
      layout, setLayout,
      settings, setSettings,
      selectedBlockId, setSelectedBlockId
    }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
}
