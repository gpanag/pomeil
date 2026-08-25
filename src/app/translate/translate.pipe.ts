import { Pipe, PipeTransform } from "@angular/core";
import { TranslateService } from "./translate.service";

@Pipe({
  name: "translate",
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  constructor(private translate: TranslateService) { }

  transform(value: string, args?: any): any {
    if (!this.translate?.data) return value;

    const keys = value.split(".");
    let current: any = this.translate.data;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') return value;
      current = current[key];
    }

    return typeof current === 'string' ? current : value;
  }
}
