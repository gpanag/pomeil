import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsFrontComponent } from './news-front.component';

describe('NewsFrontComponent', () => {
  let component: NewsFrontComponent;
  let fixture: ComponentFixture<NewsFrontComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NewsFrontComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewsFrontComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
