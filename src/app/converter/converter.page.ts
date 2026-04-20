import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ConversionService } from '../services/conversion.service';
import { ThemeService } from '../services/theme.service';
import { ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import * as Tesseract from 'tesseract.js';

Chart.register(...registerables);

@Component({
  selector: 'app-converter',
  templateUrl: './converter.page.html',
  styleUrls: ['./converter.page.scss'],
  standalone: false,
})
export class ConverterPage implements OnInit, AfterViewInit {
  @ViewChild('trendChart') trendChartCanvas!: ElementRef;
  chart: any;
  category: string = '';
  title: string = '';
  units: string[] = [];
  
  fromUnit: string = '';
  toUnit: string = '';
  inputValue: number = 0;
  outputValue: number = 0;
  isLoading: boolean = false;

  unitConfig: any = {
    currency: { title: 'Mata Uang', units: ['USD', 'IDR', 'EUR', 'JPY', 'GBP', 'AUD', 'SGD', 'MYR', 'THB', 'SAR', 'KRW', 'PHP', 'VND', 'INR', 'CNY', 'NZD', 'CAD', 'CHF', 'HKD', 'SEK', 'ZAR', 'BRL', 'MXN', 'TRY', 'RUB', 'AED', 'TWD'] },
    length: { title: 'Panjang', units: ['mm', 'cm', 'm', 'km', 'inch', 'feet'] },
    weight: { title: 'Berat', units: ['mg', 'g', 'kg', 'oz', 'lb'] },
    shopping: { title: 'Belanja', units: ['Harga'] },
    health: { title: 'Kesehatan (BMI)', units: ['Berat (kg)'] },
    age: { title: 'Kalkulator Umur', units: ['Tanggal Lahir'] }
  };

  shoppingMode: 'calculator' | 'splitbill' = 'calculator';
  splitItems: { id: number, name: string, price: number, result?: number }[] = [
    { id: 1, name: 'Orang 1', price: null as any }
  ];
  discount: number = 0;
  tax: number = 0;
  height: number = 0;
  activityLevel: string = 'sedang';
  birthDate: string = '';
  ageResult: any = null;
  healthStatus: any = null;
  waterNeeded: number = 0;
  caloriesNeeded: number = 0;

  constructor(
    private route: ActivatedRoute,
    private conversionService: ConversionService,
    public themeService: ThemeService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.category = params['type'] || 'currency';
      const config = this.unitConfig[this.category];
      this.title = config.title;
      this.units = config.units;
      this.fromUnit = this.units[0];
      this.toUnit = this.units[1];
      this.convert();
    });
  }

  ngAfterViewInit() {
    if (this.category === 'currency') {
      setTimeout(() => this.updateChart(), 1000);
    }
  }

  addSplitItem() {
    this.splitItems.push({ id: Date.now(), name: `Orang ${this.splitItems.length + 1}`, price: null as any });
    this.convert();
  }

  removeSplitItem(index: number) {
    if (this.splitItems.length > 1) {
      this.splitItems.splice(index, 1);
      this.convert();
    }
  }

  async convert() {
    if (this.category !== 'shopping' && (this.inputValue === null || this.inputValue === undefined)) {
      this.outputValue = 0;
      return;
    }

    try {
      this.isLoading = true;
      if (this.category === 'shopping' && this.shoppingMode === 'splitbill') {
        const payload = this.splitItems.map(item => ({ name: item.name, price: item.price || 0 }));
        const results = await this.conversionService.convert(
          this.category, '', '', 0,
          { mode: 'splitbill', items: payload, discount: this.discount || 0, tax: this.tax || 0 }
        );
        this.splitItems.forEach((item, i) => item.result = results[i].result);
        this.outputValue = results.reduce((sum: number, item: any) => sum + item.result, 0);
      } else if (this.category === 'age') {
        if (!this.birthDate) return;
        this.ageResult = await this.conversionService.convert(
          this.category, '', '', 0, { birthDate: this.birthDate }
        );
      } else if (this.category === 'health') {
        const results = await this.conversionService.convert(
          this.category,
          this.fromUnit,
          this.toUnit,
          this.inputValue,
          { weight: this.inputValue, height: this.height, activityLevel: this.activityLevel }
        );
        this.outputValue = results.bmi;
        this.waterNeeded = results.water;
        this.caloriesNeeded = results.calories;
        this.healthStatus = this.conversionService.getHealthStatus(this.outputValue);
      } else {
        this.outputValue = await this.conversionService.convert(
          this.category,
          this.fromUnit,
          this.toUnit,
          this.inputValue,
          { mode: 'calculator', discount: this.discount, tax: this.tax }
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading = false;
      if (this.category === 'currency') {
        this.updateChart();
      }
    }
  }

  async updateChart() {
    const history = await this.conversionService.getHistory(this.fromUnit, this.toUnit);
    if (!history.length) return;

    const labels = history.map((h: any) => h.date.split('-').slice(1).join('/'));
    const data = history.map((h: any) => h.rate);

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      this.chart.update();
    } else {
      this.initChart(labels, data);
    }
  }

  initChart(labels: string[], data: number[]) {
    if (!this.trendChartCanvas) return;
    
    const ctx = this.trendChartCanvas.nativeElement.getContext('2d');
    const isDark = this.themeService.getDarkMode();
    const color = isDark ? '#fff' : '#000';

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `Tren ${this.fromUnit}/${this.toUnit}`,
          data: data,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#4f46e5'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            ticks: { color: color, font: { size: 10 } },
            grid: { display: false }
          },
          x: {
            ticks: { color: color, font: { size: 10 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  swap() {
    const temp = this.fromUnit;
    this.fromUnit = this.toUnit;
    this.toUnit = temp;
    this.convert();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isLoading = true;
    try {
      const result = await Tesseract.recognize(file, 'eng');
      const text = result.data.text;
      
      // Extract numbers (currency often has dots/commas)
      const numbers = text.replace(/[^0-9]/g, ' ').split(' ').filter(n => n.length > 2);
      if (numbers.length > 0) {
        // Find the largest number (likely the price)
        const largest = Math.max(...numbers.map(n => parseInt(n)));
        this.inputValue = largest;
        this.convert();
      }
    } catch (error) {
      console.error('OCR Error:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
