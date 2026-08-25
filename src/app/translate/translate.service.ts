import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Subject } from "rxjs";

@Injectable({
  providedIn: "root"
})
export class TranslateService {
  data: any = {};
  lang: any = 'en';

  private language = new Subject<string>();
  lang$ = this.language.asObservable();

  private langData = new Subject<any>();
  langData$ = this.langData.asObservable();

  getLangData() {
    return this.data;
  }

  langDataReady(data: any) {
    this.langData.next(data)
  }

  constructor(private http: HttpClient) {

    // this.lang = localStorage.getItem('language');
  }



  use(lang: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const langPath = `/assets/i18n/${lang || "en"}.json`;
      this.http.get<any>(langPath).subscribe(
        translation => {

          this.data = Object.assign({}, translation || {});
          // console.log(this.data)
          resolve(this.data);
          this.langDataReady(this.data)
          this.setLang(lang);
        },
        error => {
          this.data = {};
          resolve(this.data);
        }
      );
    });
  }

  setLang(lang: string) {
    this.lang = lang;
    // console.log(lang)
    this.language.next(lang);
  }

  getLang() {
    return this.lang;
  }

}
