import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FrontPartnersComponent } from './front-partners.component';

describe('FrontPartnersComponent', () => {
  let component: FrontPartnersComponent;
  let fixture: ComponentFixture<FrontPartnersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FrontPartnersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FrontPartnersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
