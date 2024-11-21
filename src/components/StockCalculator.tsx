'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, Trash2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

class StorageService {
  static setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  static getItem<T>(key: string, defaultValue: T): T {
    const storedValue = localStorage.getItem(key);
    return storedValue ? (JSON.parse(storedValue) as T) : defaultValue;
  }

  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  static clear(): void {
    localStorage.clear();
  }
}


const STORAGE_KEYS = {
  PURCHASES: 'purchases',
  CUSTOM_PROFIT: 'customProfit',
  DESIRED_PRICE: 'desiredPrice',
};


export default function StockCalculator() {
  const [purchases, setPurchases] = useState(
    StorageService.getItem(
      STORAGE_KEYS.PURCHASES,
      [
        { price: '', quantity: '' },
        { price: '', quantity: '' },
        { price: '', quantity: '' }
      ]
    ))
  const [averagePrice, setAveragePrice] = useState<number | null>(null)
  const [customProfit, setCustomProfit] = useState(
    StorageService.getItem(STORAGE_KEYS.CUSTOM_PROFIT, '')
  )
  const [desiredPrice, setDesiredPrice] = useState(
    StorageService.getItem(STORAGE_KEYS.DESIRED_PRICE, '')
  )
  const [calculatedProfit, setCalculatedProfit] = useState<number | null>(null)
  const [buyFeeEnabled, setBuyFeeEnabled] = useState(true)
  const [sellFeeEnabled, setSellFeeEnabled] = useState(true)
  const [feeConfigTitle, setFeeConfigTitle] = useState('- / -')
  const [buyFeePercentage, setBuyFeePercentage] = useState('0.02')
  const [sellFeePercentage, setSellFeePercentage] = useState('0.02')
  const [totalHeldQuantity, setTotalHeldQuantity] = useState<number>(0)
  const [totalSpent, setTotalSpent] = useState<number>(0)

  const handlePurchaseChange = (index: number, field: 'price' | 'quantity', value: string) => {
    const newPurchases = [...purchases]
    newPurchases[index][field] = value
    setPurchases(newPurchases)
  }

  const addPurchase = () => {
    setPurchases([...purchases, { price: '', quantity: '' }])
  }

  const clearPurchases = () => {
    setPurchases([
      { price: '', quantity: '' },
      { price: '', quantity: '' },
      { price: '', quantity: '' }
    ])
  }

  const removePurchase = (index: number) => {
    if (purchases.length > 1) {
      const newPurchases = purchases.filter((_, i) => i !== index)
      setPurchases(newPurchases)
    }
  }

  const calculateAveragePrice = useCallback(() => {
    let totalCost = 0
    let totalQuantity = 0
    let heldQuantity = 0
    
    for (const purchase of purchases) {
      const price = parseFloat(purchase.price)
      const quantity = parseFloat(purchase.quantity)
      
      if (!isNaN(price) && !isNaN(quantity)) {
        const cost = price * quantity
        totalCost += cost
        const held = buyFeeEnabled ? quantity * (1 - parseFloat(buyFeePercentage) / 100) : quantity
        totalQuantity += held
        heldQuantity += held
      }
    }
    
    if (totalQuantity === 0) {
      setAveragePrice(null)
      setTotalHeldQuantity(0)
      setTotalSpent(0)
      return
    }
    
    const average = totalCost / totalQuantity
    setAveragePrice(parseFloat(average.toFixed(4)))
    setTotalHeldQuantity(parseFloat(heldQuantity.toFixed(4)))
    setTotalSpent(parseFloat(totalCost.toFixed(4)))
  }, [purchases, buyFeeEnabled, buyFeePercentage])

  const spendingAmounts = useMemo(() => {
    return purchases.map(purchase => {
      const price = parseFloat(purchase.price)
      const quantity = parseFloat(purchase.quantity)
      if (!isNaN(price) && !isNaN(quantity)) {
        const cost = price * quantity
        return {
          original: cost.toFixed(4),
          heldQuantity: buyFeeEnabled ? (quantity * (1 - parseFloat(buyFeePercentage) / 100)).toFixed(4) : quantity.toFixed(4)
        }
      }
      return { original: '', heldQuantity: '' }
    })
  }, [purchases, buyFeeEnabled, buyFeePercentage])

  const profitPercentages = [1, 2, 3, 4, 5]

  const calculateProfitPrice = (percentage: number) => {
    if (averagePrice === null) return null
    const profitPrice = averagePrice * (1 + percentage / 100)
    if (sellFeeEnabled) {
      const feeAmount = profitPrice * (parseFloat(sellFeePercentage) / 100)
      return (profitPrice - feeAmount).toFixed(4)
    }
    return profitPrice.toFixed(4)
  }

  const calculateProfitGross = (percentage: number) => {
    const profitPrice = calculateProfitPrice(percentage)
    if (profitPrice === null) return null
    return (parseFloat(profitPrice) * totalHeldQuantity).toFixed(4)
  }

  const calculateProfitNet = (percentage: number) => {
    const profitGross = calculateProfitGross(percentage)
    if (averagePrice === null || profitGross === null) return null
    return (parseFloat(profitGross) - averagePrice * totalHeldQuantity).toFixed(4)
  }

  const calculateProfitPercentage = useCallback(() => {
    if (averagePrice === null || desiredPrice === '') {
      setCalculatedProfit(null)
      return
    }
    const desiredPriceNum = parseFloat(desiredPrice)
    if (isNaN(desiredPriceNum)) {
      setCalculatedProfit(null)
      return
    }
    let effectiveDesiredPrice = desiredPriceNum
    if (sellFeeEnabled) {
      effectiveDesiredPrice = desiredPriceNum * (1 - parseFloat(sellFeePercentage) / 100)
    }
    const profitPercentage = ((effectiveDesiredPrice - averagePrice) / averagePrice) * 100
    setCalculatedProfit(parseFloat(profitPercentage.toFixed(4)))
  }, [averagePrice, desiredPrice, sellFeeEnabled, sellFeePercentage])

  const updateFeeLable = useCallback(() => {
    setFeeConfigTitle(`${ buyFeeEnabled ? buyFeePercentage : '-'} / ${ sellFeeEnabled ? sellFeePercentage : '-'}`)
  }, [buyFeeEnabled, buyFeePercentage, sellFeeEnabled, sellFeePercentage])

  useEffect(() => {
    calculateAveragePrice()
  }, [calculateAveragePrice])

  useEffect(() => {
    calculateProfitPercentage()
  }, [calculateProfitPercentage])

  useEffect(() => {
    updateFeeLable()
  }, [updateFeeLable])

  useEffect(() => {
    StorageService.setItem(STORAGE_KEYS.PURCHASES, purchases)
  }, [purchases])

  useEffect(() => {
    StorageService.setItem(STORAGE_KEYS.CUSTOM_PROFIT, customProfit)
  }, [customProfit])

  useEffect(() => {
    StorageService.setItem(STORAGE_KEYS.DESIRED_PRICE, desiredPrice)
  }, [desiredPrice])

  return (
    <div className="container mx-auto p-0 sm:p-4">
      <Card className="border-0 sm:border w-full sm:w-auto mx-0 sm:mx-auto">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className='text-3xl'>Stock Calculator</CardTitle>
          <CardDescription>Calculate average buy price and profit targets</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 w-full">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/2 space-y-6">
              <div>
                <Collapsible>
                  <div className="flex items-center justify-between space-x-4 px-4">
                    <h3 className="text-lg font-semibold mb-4">Fee Configuration</h3>
                    <h3 className="text-lg mb-4">{feeConfigTitle}</h3>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings2 className="mr-2 h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="buy-fee-toggle">Enable Buy Fee</Label>
                        <Switch
                          id="buy-fee-toggle"
                          checked={buyFeeEnabled}
                          onCheckedChange={setBuyFeeEnabled}
                        />
                      </div>
                      {buyFeeEnabled && (
                        <div className="flex items-center gap-2">
                          <Label htmlFor="buy-fee-percentage">Buy Fee %</Label>
                          <Input
                            id="buy-fee-percentage"
                            type="number"
                            value={buyFeePercentage}
                            onChange={(e) => setBuyFeePercentage(e.target.value)}
                            className="w-20"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sell-fee-toggle">Enable Sell Fee</Label>
                        <Switch
                          id="sell-fee-toggle"
                          checked={sellFeeEnabled}
                          onCheckedChange={setSellFeeEnabled}
                        />
                      </div>
                      {sellFeeEnabled && (
                        <div className="flex items-center gap-2">
                          <Label htmlFor="sell-fee-percentage">Sell Fee %</Label>
                          <Input
                            id="sell-fee-percentage"
                            type="number"
                            value={sellFeePercentage}
                            onChange={(e) => setSellFeePercentage(e.target.value)}
                            className="w-20"
                          />
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="[&>th]:p-2 [&>th]:sm:p-4">
                    <TableHead>Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Spending</TableHead>
                    {buyFeeEnabled && <TableHead>Held Quantity</TableHead>}
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase, index) => (
                    <TableRow key={index} className="[&>td]:p-2 [&>td]:sm:p-4">
                      <TableCell>
                        <Input
                          type="number"
                          value={purchase.price}
                          onChange={(e) => handlePurchaseChange(index, 'price', e.target.value)}
                          placeholder="Enter price"
                          aria-label={`Price for purchase ${index + 1}`}
                          className="w-full text-sm sm:text-base p-1 sm:p-2"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={purchase.quantity}
                          onChange={(e) => handlePurchaseChange(index, 'quantity', e.target.value)}
                          placeholder="Enter quantity"
                          aria-label={`Quantity for purchase ${index + 1}`}
                          className="w-full text-sm sm:text-base p-1 sm:p-2"
                        />
                      </TableCell>
                      <TableCell>
                        {spendingAmounts[index].original ? `$${spendingAmounts[index].original}` : '-'}
                      </TableCell>
                      {buyFeeEnabled && (
                        <TableCell>
                          {spendingAmounts[index].heldQuantity}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => removePurchase(index)}
                          aria-label={`Remove purchase ${index + 1}`}
                          className="p-1 sm:p-2"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button onClick={addPurchase} className='mr-4'>
                <Plus className="mr-2 h-4 w-4" /> Add Position
              </Button>
              <Button onClick={clearPurchases}>
                <Trash2 className="mr-2 h-4 w-5"/> Clear Positions
              </Button>
              {averagePrice !== null && (
                <div className="space-y-2">
                  <p className="text-lg font-semibold">
                    Average Buy Price: ${averagePrice}
                  </p>
                  <p>
                    Total Held Quantity: {totalHeldQuantity}
                  </p>
                  <p>
                    Total Spent: ${totalSpent}
                  </p>
                </div>
              )}
            </div>
            <div className="w-full lg:w-1/2 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Profit Targets</h3>
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profit %</TableHead>
                      <TableHead>Gross $</TableHead>
                      <TableHead>Net $</TableHead>
                      <TableHead>Selling Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitPercentages.map((percentage) => (
                      <TableRow key={percentage}>
                        <TableCell className='text-left'>{percentage}%</TableCell>
                        <TableCell className='text-left'>{calculateProfitGross(percentage)??'-'}</TableCell>
                        <TableCell className='text-left'>{calculateProfitNet(percentage)??'-'}</TableCell>
                        <TableCell className='text-left'>
                          {averagePrice !== null 
                            ? `$${calculateProfitPrice(percentage)}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell>
                        <Input
                          type="number"
                          value={customProfit}
                          onChange={(e) => {
                            setCustomProfit(e.target.value)
                          }}
                          placeholder="Custom %"
                          aria-label="Custom profit percentage"
                        />
                      </TableCell>
                      <TableCell className='text-left'>{customProfit ? calculateProfitGross(parseFloat(customProfit)) : '-'}</TableCell>
                      <TableCell className='text-left'>{customProfit ? calculateProfitNet(parseFloat(customProfit)) : '-'}</TableCell>
                      <TableCell className='text-left'>
                        {averagePrice !== null && customProfit
                          ? `$${calculateProfitPrice(parseFloat(customProfit) || 0)}`
                          : '-'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {averagePrice === null && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Enter purchase details to see profit calculations.
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Calculate Profit</h3>
                <div className="flex items-end gap-4">
                  <div className="flex-grow">
                    <Label htmlFor="desired-price">Desired Selling Price</Label>
                    <Input
                      id="desired-price"
                      type="number"
                      value={desiredPrice}
                      onChange={(e) => setDesiredPrice(e.target.value)}
                      placeholder="Enter desired price"
                      aria-label="Desired selling price"
                    />
                  </div>
                </div>
                {calculatedProfit !== null && (
                  <div className="grid grid-cols-2 gap-2 mt-4 items-baseline">
                    <p className="font-semibold text-right">Profit Percentage:</p>
                    <p className="text-left">{calculatedProfit}%</p>

                    <p className="font-semibold text-right">Profit Gross:</p>
                    <p className="text-left">${calculateProfitGross(calculatedProfit)}</p>

                    <p className="font-semibold text-right">Profit Net:</p>
                    <p className="text-left">${calculateProfitNet(calculatedProfit)}</p>
                  </div>
                )}
                {averagePrice === null && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Enter purchase details to calculate profit.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}