import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  partnersURL = '/api/partners';
  aboutURL = '/api/about';
  newsURL = '/api/news';
  articlesURL = '/api/articles';
  leafletsURL = '/api/leaflets';
  newslettersURL = '/api/newsletters';
  objectivesURL = '/api/objectives';
  workpackagesURL = '/api/workpackages';

  constructor(private httpClient: HttpClient) { }

  getPartnersFull() {
    return this.httpClient.get(this.partnersURL + '?populate=*&pagination[page]=1&pagination[pageSize]=2000&sort[0]=name:asc');
  }

  getPartner(id: any) {
    return this.httpClient.get(this.partnersURL + '/' + id + '?populate=*');
  }

  getAbout() {
    return this.httpClient.get(this.aboutURL + '?populate=*');
  }

  getNewsFull(pageIndex: number, pageSize: number) {
    return this.httpClient.get(this.newsURL + '?populate=*&pagination[page]=' + pageIndex + '&pagination[pageSize]=' + pageSize + '&sort[0]=publishedAt:desc');
  }

  getNewslettersFull(pageIndex: number, pageSize: number) {
    return this.httpClient.get(this.newslettersURL + '?populate=*&pagination[page]=' + pageIndex + '&pagination[pageSize]=' + pageSize + '&sort[0]=publishedAt:desc');
  }

  getNews() {
    // 12 is plenty of headroom — Strapi returns whatever exists up to that
    // limit, sorted newest first. Keeps the home magazine grid full
    // without forcing a per-route overload of the page-size constant.
    return this.httpClient.get(this.newsURL + '?populate=*&pagination[page]=1&pagination[pageSize]=12&sort[0]=publishedAt:desc');
  }
  getNewsletters() {
    return this.httpClient.get(this.newslettersURL + '?populate=*&pagination[page]=1&pagination[pageSize]=12&sort[0]=publishedAt:desc');
  }

  getNew(documentId: string) {
    return this.httpClient.get(this.newsURL + '/' + documentId + '?populate=*');
  }

  getObjectivesFull() {
    return this.httpClient.get(this.objectivesURL + '?populate=*&pagination[page]=1&pagination[pageSize]=2000&sort[0]=order:asc');
  }

  getWorkpackagesFull() {
    return this.httpClient.get(this.workpackagesURL + '?populate=*&pagination[page]=1&pagination[pageSize]=2000&sort[0]=order:asc');
  }


  getArticles(pageIndex: number, pageSize: number) {
    return this.httpClient.get(this.articlesURL + '?populate=*&pagination[page]=' + pageIndex + '&pagination[pageSize]=' + pageSize + '&sort[0]=publishedAt:desc');
  }

    getArticlesFull() {
    return this.httpClient.get(this.articlesURL + '?populate=*&pagination[page]=1&pagination[pageSize]=2000&sort[0]=publishedAt:desc');
  }


  getArticle(id: number) {
    return this.httpClient.get(this.articlesURL + '/' + id + '?populate=*');
  }

    getLeaflets() {
    return this.httpClient.get(this.leafletsURL + '?populate=*&pagination[page]=1&pagination[pageSize]=2000&sort[0]=publishedAt:asc');
  }

}
