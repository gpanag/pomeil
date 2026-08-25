import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../api.service';
import { TranslateService } from '../translate/translate.service';

// Legacy numeric "/partner/N" URLs resolve to the partner whose Strapi numeric id is N + 1.
// Strapi v5 reassigns that numeric id every time an entry is re-published, so partner links now
// use the stable `documentId` instead. This table pins any legacy numeric URL whose underlying id
// has since shifted to the partner's documentId, so old/bookmarked links keep resolving.
// MMC Mavis: /partner/16 was id 17; re-publishing (website .eu -> .pl) moved it to id 22.
const LEGACY_PARTNER_ALIASES: { [legacyId: string]: string } = {
  '16': 'vooc8xtp2a1hnxnhauc7n85r', // MMC Mavis
};

@Component({
  selector: 'app-partner',
  templateUrl: './partner.component.html',
  styleUrl: './partner.component.scss'
})
export class PartnerComponent {
  id: string = '';
  partner: any;
  partners: any;
  suffleCards = true;

  lang: string = 'en';

  constructor(private apiService: ApiService, private route: ActivatedRoute, private translateService: TranslateService) {

    this.lang = this.translateService.getLang();
    this.translateService.lang$.subscribe(value => {
      this.lang = value;
    });

    this.route.paramMap.subscribe((params: any) => {
      this.id = params.params.id;
      if (this.id != null) {

        this.apiService.getPartnersFull().subscribe((data: any) => {

          this.partners = data.data;
          const param = String(this.id);

          // Preferred: stable documentId (survives Strapi re-publish).
          let match = this.partners.find((p: any) => String(p.documentId) === param);

          // Backward-compatible: legacy numeric "/partner/N" URLs (partner id === N + 1),
          // with an alias for any partner whose numeric id has since shifted.
          if (!match && /^\d+$/.test(param)) {
            const aliasDocId = LEGACY_PARTNER_ALIASES[param];
            match = aliasDocId
              ? this.partners.find((p: any) => String(p.documentId) === aliasDocId)
              : this.partners.find((p: any) => Number(p.id) === Number(param) + 1);
          }

          this.partner = match;
        });
      }
    });

  }
}
