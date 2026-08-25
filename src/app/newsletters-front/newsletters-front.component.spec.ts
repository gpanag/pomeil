import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewslettersFrontComponent } from './newsletters-front.component';

describe('NewslettersFrontComponent', () => {
  let component: NewslettersFrontComponent;
  let fixture: ComponentFixture<NewslettersFrontComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NewslettersFrontComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewslettersFrontComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
