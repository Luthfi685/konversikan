import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConversionService {
  private currencyApi = 'https://api.exchangerate-api.com/v4/latest/';

  constructor(private http: HttpClient) {}

  async convert(category: string, from: string, to: string, value: number, extra?: any): Promise<any> {
    if (category === 'currency') {
      return this.convertCurrency(from, to, value);
    }
    if (category === 'health') {
      return {
        bmi: this.calculateBMI(extra?.weight || 0, extra?.height || 0),
        water: this.calculateWater(extra?.weight || 0, extra?.activityLevel || 'sedang'),
        calories: this.calculateCalories(extra?.weight || 0, extra?.activityLevel || 'sedang')
      };
    }
    if (category === 'age') {
      return this.calculateAgeDetails(extra?.birthDate);
    }
    if (category === 'shopping') {
      if (extra?.mode === 'splitbill') {
        return this.calculateItemizedSplitBill(extra?.items || [], extra?.discount || 0, extra?.tax || 0);
      }
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

  private calculateItemizedSplitBill(items: any[], discount: number, tax: number): any[] {
    const subtotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
    if (subtotal <= 0) return items.map(item => ({...item, result: 0}));

    const finalSubtotal = subtotal - (subtotal * (discount / 100));
    const totalWithTax = finalSubtotal + (finalSubtotal * (tax / 100));

    return items.map(item => {
      const proportion = (item.price || 0) / subtotal;
      return {
        ...item,
        result: proportion * totalWithTax
      };
    });
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

  private calculateWater(weight: number, activityLevel: string): number {
    if (!weight) return 0;
    let multiplier = 0.033; // rendah
    if (activityLevel === 'sedang') multiplier = 0.040;
    if (activityLevel === 'tinggi') multiplier = 0.045;
    return weight * multiplier;
  }

  private calculateCalories(weight: number, activityLevel: string): number {
    if (!weight) return 0;
    let multiplier = 24; // rendah
    if (activityLevel === 'sedang') multiplier = 30;
    if (activityLevel === 'tinggi') multiplier = 35;
    return weight * multiplier;
  }

  private calculateAgeDetails(birthDateStr: string): any {
    if (!birthDateStr) return null;
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    
    // Total days lived
    const diffTime = Math.abs(today.getTime() - birthDate.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Years, Months, Days
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    
    // Zodiac
    const day = birthDate.getDate();
    const month = birthDate.getMonth() + 1;
    let zodiac = '';
    if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) zodiac = 'Aquarius ♒';
    else if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) zodiac = 'Pisces ♓';
    else if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) zodiac = 'Aries ♈';
    else if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) zodiac = 'Taurus ♉';
    else if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) zodiac = 'Gemini ♊';
    else if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) zodiac = 'Cancer ♋';
    else if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) zodiac = 'Leo ♌';
    else if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) zodiac = 'Virgo ♍';
    else if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) zodiac = 'Libra ♎';
    else if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) zodiac = 'Scorpio ♏';
    else if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) zodiac = 'Sagittarius ♐';
    else if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) zodiac = 'Capricorn ♑';
    
    // Shio (Chinese Zodiac)
    const index = birthDate.getFullYear() % 12;
    const shioList = ['Monyet', 'Ayam', 'Anjing', 'Babi', 'Tikus', 'Kerbau', 'Macan', 'Kelinci', 'Naga', 'Ular', 'Kuda', 'Kambing'];
    const shioEmoji = ['🐒','🐓','🐕','🐖','🐁','🐂','🐅','🐇','🐉','🐍','🐎','🐐'];
    const shio = shioList[index] + ' ' + shioEmoji[index];

    return {
      exactAge: `${years} Tahun, ${months} Bulan, ${days} Hari`,
      totalDays: totalDays,
      zodiac: zodiac,
      shio: shio
    };
  }

  getHealthStatus(bmi: number): { label: string, color: string } {
    if (bmi < 18.5) return { label: 'Kurus (Underweight)', color: '#3880ff' };
    if (bmi < 25) return { label: 'Normal', color: '#2dd36f' };
    if (bmi < 30) return { label: 'Gemuk (Overweight)', color: '#ffc409' };
    return { label: 'Obesitas', color: '#eb445a' };
  }
}
