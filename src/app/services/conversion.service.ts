import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConversionService {
  private currencyApi = 'https://api.exchangerate-api.com/v4/latest/';

  constructor(private http: HttpClient) {}

  async convert(category: string, from: string, to: string, value: number, extra?: any): Promise<number> {
    if (category === 'currency') {
      return this.convertCurrency(from, to, value);
    }
    if (category === 'health') {
      return this.calculateBMI(extra?.weight || 0, extra?.height || 0);
    }
    if (category === 'shopping') {
      return this.calculateShopping(value, extra?.discount || 0, extra?.tax || 0);
    }

    switch (category) {
      case 'temperature':
        return this.convertTemperature(from, to, value);
      case 'length':
        return this.convertLength(from, to, value);
      case 'weight':
        return this.convertWeight(from, to, value);
      default:
        return value;
    }
  }

  private async convertCurrency(from: string, to: string, value: number): Promise<number> {
    const cacheKey = `rates_${from}`;
    try {
      const data: any = await firstValueFrom(this.http.get(`${this.currencyApi}${from}`));
      localStorage.setItem(cacheKey, JSON.stringify({
        rates: data.rates,
        timestamp: new Date().getTime()
      }));
      const rate = data.rates[to];
      return value * rate;
    } catch (error) {
      console.warn('Using cached currency data due to error:', error);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        const rate = data.rates[to];
        return value * rate;
      }
      throw new Error('Koneksi internet diperlukan untuk data kurs pertama kali.');
    }
  }

  private calculateShopping(price: number, discount: number, tax: number): number {
    const discountedPrice = price - (price * (discount / 100));
    const finalPrice = discountedPrice + (discountedPrice * (tax / 100));
    return finalPrice;
  }

  private convertTemperature(from: string, to: string, value: number): number {
    let celsius = value;
    if (from === 'F') celsius = (value - 32) * 5 / 9;
    if (from === 'K') celsius = value - 273.15;

    if (to === 'C') return celsius;
    if (to === 'F') return (celsius * 9 / 5) + 32;
    if (to === 'K') return celsius + 273.15;
    return value;
  }

  private convertLength(from: string, to: string, value: number): number {
    const units: any = {
      'mm': 0.001,
      'cm': 0.01,
      'm': 1,
      'km': 1000,
      'inch': 0.0254,
      'feet': 0.3048
    };
    const meters = value * units[from];
    return meters / units[to];
  }

  private convertWeight(from: string, to: string, value: number): number {
    const units: any = {
      'mg': 0.001,
      'g': 1,
      'kg': 1000,
      'oz': 28.3495,
      'lb': 453.592
    };
    const grams = value * units[from];
    return grams / units[to];
  }

  async getHistory(from: string, to: string): Promise<{ date: string, rate: number }[]> {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const historyApi = `https://api.frankfurter.app/${startDate}..${endDate}?from=${from}&to=${to}`;

    try {
      const data: any = await firstValueFrom(this.http.get(historyApi));
      return Object.keys(data.rates).map(date => ({
        date,
        rate: data.rates[date][to]
      }));
    } catch (error) {
      console.warn('History API error, using mockup data based on current rate:', error);
      
      let baseRate = 1;
      try {
        baseRate = await this.convertCurrency(from, to, 1);
      } catch (convError) {
        baseRate = from === 'USD' && to === 'IDR' ? 16200 : 1;
      }

      // Fallback mockup data based on current baseRate
      return dates.map((date) => ({
        date,
        rate: baseRate + (Math.random() * (baseRate * 0.02) - (baseRate * 0.01)) // Random drift +/- 1%
      }));
    }
  }

  private calculateBMI(weight: number, height: number): number {
    if (!weight || !height) return 0;
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  }

  getHealthStatus(bmi: number): { label: string, color: string } {
    if (bmi < 18.5) return { label: 'Kurus (Underweight)', color: '#3880ff' };
    if (bmi < 25) return { label: 'Normal', color: '#2dd36f' };
    if (bmi < 30) return { label: 'Gemuk (Overweight)', color: '#ffc409' };
    return { label: 'Obesitas', color: '#eb445a' };
  }
}
