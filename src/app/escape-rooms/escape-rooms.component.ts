import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { TranslateService } from '../translate/translate.service';

@Component({
    selector: 'app-escape-rooms',
    templateUrl: './escape-rooms.component.html',
    styleUrl: './escape-rooms.component.scss',
    animations: [
        // Each unique animation requires its own trigger. The first argument of the trigger function is the name
        // fader,
        trigger('rotatedState', [
            state('default', style({ transform: 'translateY(0)' })),
            state('rotated', style({ transform: 'rotateY(360deg)' })),
            transition('rotated <=> default', animate('800ms ease-in-out')),
            transition('default <=> rotated', animate('800ms ease-in-out'))
        ]),
        trigger('listAnimation', [
            transition('* <=> *', [
                query('.item-card:leave', [
                    style({ transform: 'translateY(0)', opacity: 1 }),
                    stagger(10, [
                        animate('.1s ease-in-out', style({ transform: 'translateY(24px)', opacity: 0 }))
                    ])
                ], { optional: true, limit: 20 }),
                query('.item-card:enter', [
                    style({ transform: 'translateY(24px)', opacity: 0 }),
                    stagger(100, [
                        animate('.8s ease-in-out', style({ transform: 'translateY(0)', opacity: 1 }))
                    ])
                ], { optional: true, limit: 20 })
            ])
        ]),
        trigger('rotatedStateList', [
            state('default', style({ transform: 'translateY(0)' })),
            state('rotated', style({ transform: 'translate(72px)' })),
            transition('rotated <=> default', animate('800ms ease-in-out')),
            transition('default <=> rotated', animate('800ms ease-in-out'))
        ]),
        trigger('listAnimationList', [
            transition('* <=> *', [
                query('.item-list:leave', [
                    style({ transform: 'translateY(0) translateX(0)', opacity: 1 }),
                    stagger(10, [
                        animate('.1s ease-in-out', style({ transform: 'translateY(72px) translateX(300px)', opacity: 0 }))
                    ])
                ], { optional: true, limit: 20 }),
                query('.item-list:enter', [
                    style({ transform: 'translateY(72px) translateX(300px)', opacity: 0 }),
                    stagger(100, [
                        animate('.8s ease-in-out', style({ transform: 'translateY(0) translateX(0)', opacity: 1 }))
                    ])
                ], { optional: true, limit: 20 })
            ])
        ]),
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class EscapeRoomsComponent {
listGrid: boolean = false;
  suffleCards = true;

  rooms: any = [
    {
      name: "cultural-awareness",
      title: "Cultural Awareness",
      id: 1,
      image: 'assets/thumbs/cultural-awareness.webp',
    },
    {
      name: "empathy",
      title: "Empathy",
      id: 2,
      image: 'assets/thumbs/empathy.webp',
    },
    {
      name: "strategic-thinking",
      title: "Strategic Thinking",
      id: 3,
      image: 'assets/thumbs/strategic-thinking.webp',
    },
    {
      name: "open-mindedness",
      title: "Open-Mindedness",
      id: 4,
      image: 'assets/thumbs/open-mindedness.webp',
    },
    {
      name: "financial",
      title: "Financial Literacy",
      id: 5,
      image: 'assets/thumbs/financial.webp',
    },
    {
      name: "stress-management",
      title: "Stress Management",
      id: 6,
      image: 'assets/thumbs/stress-management.webp',
    },
    {
      name: "trust-building",
      title: "Trust Building",
      id: 7,
      image: 'assets/thumbs/trust-building.webp',
    },
    {
      name: "active-listening",
      title: "Active Listening",
      id: 8,
      image: 'assets/thumbs/active-listening.webp',
    },
    {
      name: "adaptability",
      title: "Adaptability",
      id: 9,
      image: 'assets/thumbs/adaptability.webp',
    },
    {
      name: "flexibility",
      title: "Flexibility",
      id: 10,
      image: 'assets/thumbs/flexibility.webp',
    },
    {
      name: "interpersonal-skills",
      title: "Interpersonal Skills",
      id: 11,
      image: 'assets/thumbs/interpersonal-skills.webp',
    },
    {
      name: "language-skills",
      title: "Language Skills",
      id: 12,
      image: 'assets/thumbs/language-skills.webp',
    },
    {
      name: "market-awareness",
      title: "Market Awareness",
      id: 21,
      image: 'assets/thumbs/market-awareness.webp',
    },
    {
      name: "legal-compliance",
      title: "Legal Compliance",
      id: 20,
      image: 'assets/thumbs/legal-compliance.webp',
    },
    {
      name: "self-reliance",
      title: "Self-Reliance",
      id: 14,
      image: 'assets/thumbs/self-reliance.webp',
    },
    {
      name: "teamwork",
      title: "Teamwork",
      id: 15,
      image: 'assets/thumbs/teamwork.webp',
    },
    {
      name: "resilience",
      title: "Resilience",
      id: 16,
      image: 'assets/thumbs/resilience.webp',
    },
    {
      name: "motivating-others",
      title: "Motivating & Inspiring Others",
      id: 22,
      image: 'assets/thumbs/motivating-others.webp',
    },
    {
      name: "tolerance",
      title: "Tolerance",
      id: 23,
      image: 'assets/thumbs/tolerance.webp',
    },
    {
      name: "leadership",
      title: "Leadership",
      id: 19,
      image: 'assets/thumbs/leadership.webp',
    },
    {
      name: "decision-making",
      title: "Decision-Making",
      id: 18,
      image: 'assets/thumbs/decision-making.webp',
    },
    {
      name: "crm",
      title: "Customer Relationship Management",
      id: 17,
      image: 'assets/thumbs/crm.webp',
    },
    {
      name: "business-planning",
      title: "Business Planning",
      id: 24,
      image: 'assets/thumbs/business-planning.webp',
    },
    {
      name: "critical-thinking",
      title: "Critical Thinking",
      id: 25,
      image: 'assets/thumbs/critical-thinking.webp',
    },
    {
      name: "digital-skills",
      title: "Digital Skills",
      id: 26,
      image: 'assets/thumbs/digital-skills.webp',
    },
    {
      name: "negotiation-skills",
      title: "Negotiation Skills",
      id: 27,
      image: 'assets/thumbs/negotiation-skills.webp',
    },
    {
      name: "networking-skills",
      title: "Networking Skills",
      id: 28,
      image: 'assets/thumbs/networking-skills.webp',
    },
    {
      name: "risk-management",
      title: "Risk Management",
      id: 29,
      image: 'assets/thumbs/risk-management.webp',
    },
    {
      name: "problem-solving",
      title: "Problem Solving",
      id: 30,
      image: 'assets/thumbs/problem-solving.webp',
    },
    {
      name: "project-management",
      title: "Project Management",
      id: 31,
      image: 'assets/thumbs/project-management.webp',
    }
  ];

  lang: string = 'gr';

  darkTheme: boolean = false;

    /** Localised skill name (app i18n `SKILLS.<id>`), falling back to the
     *  English title baked into `rooms` (partner feedback 2026-08-31: room
     *  names showed in English on every non-EN locale). */
    skillTitle(id: string, fallback: string): string {
      return this.translateService.instant('SKILLS.' + id) ?? fallback;
    }

    constructor(private router: Router, private translateService: TranslateService) {
  
      this.lang = this.translateService.getLang();
      this.translateService.lang$.subscribe(value => {
        this.lang = value;
      }); 
  
  
     
  
  
    }
    openRoom(name: string) {
      this.router.navigate(['escape-rooms/' + name])
    }
}
