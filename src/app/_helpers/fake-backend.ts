import { SpinnerService } from './../spinner/spinner.service';
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpResponse,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HTTP_INTERCEPTORS,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, materialize, dematerialize, tap } from 'rxjs/operators';

const usersKey = 'Task 4';
let users = JSON.parse(localStorage.getItem(usersKey)) || [];

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const { url, method, headers, body } = request;

    return handleRoute();

    function handleRoute() {
      switch (true) {
        case url.endsWith('/users/authenticate') && method === 'POST':
          return authenticate();
        case url.endsWith('/users/register') && method === 'POST':
          return register();
        case url.endsWith('/users') && method === 'GET':
          return getUsers();
        case url.match(/\/users\/\d+$/) && method === 'GET':
          return getUserById();
        case url.match(/\/users\/\d+$/) && method === 'PUT':
          return updateUser();
        case url.match(/\/users\/\d+$/) && method === 'DELETE':
          return deleteUser();
        default:
          return next.handle(request);
      }
    }

    function authenticate() {
      const { email, password } = body;
      const user = users.find(
        (x) => x.email === email && x.password === password
      );
      if (!user) return error('email or password is incorrect');
      return ok({
        ...basicDetails(user),
        token: 'fake-jwt-token',
      });
    }

    function register() {
      const user = body;

      if (users.find((x) => x.email === user.email)) {
        return error('email "' + user.email + '" is already taken');
      }

      user.id = users.length ? Math.max(...users.map((x) => x.id)) + 1 : 1;
      users.push(user);
      localStorage.setItem(usersKey, JSON.stringify(users));
      return ok().pipe(materialize(), delay(1500), dematerialize());
    }

    function getUsers() {
      if (!isLoggedIn()) return unauthorized();
      return ok(users.map((x) => basicDetails(x))).pipe(
        materialize(),
        delay(1000),
        dematerialize()
      );
    }

    function getUserById() {
      if (!isLoggedIn()) return unauthorized();

      const user = users.find((x) => x.id === idFromUrl());
      return ok(basicDetails(user)).pipe(
        materialize(),
        delay(1500),
        dematerialize()
      );
    }

    function updateUser() {
      if (!isLoggedIn()) return unauthorized();
      // this.SpinnerService.requestStarted();
      let params = body;
      let user = users.find((x) => x.id === idFromUrl());
      if (!params.password) {
        delete params.password;
      }

      Object.assign(user, params);
      localStorage.setItem(usersKey, JSON.stringify(users));

      return ok().pipe(materialize(), delay(1500), dematerialize());
    }

    function deleteUser() {
      if (!isLoggedIn()) return unauthorized();
      users = users.filter((x) => x.id !== idFromUrl());
      localStorage.setItem(usersKey, JSON.stringify(users));
      return ok().pipe(materialize(), delay(1500), dematerialize());
    }

    function ok(body?) {
      return of(new HttpResponse({ status: 200, body })).pipe(delay(1500));
    }

    function error(message) {
      return throwError({ error: { message } }).pipe(
        materialize(),
        delay(1500),
        dematerialize()
      );
    }

    function unauthorized() {
      return throwError({
        status: 401,
        error: { message: 'Unauthorized' },
      });
    }

    function basicDetails(user) {
      const { id, email, firstName, lastName } = user;
      return { id, email, firstName, lastName };
    }

    function isLoggedIn() {
      return headers.get('Authorization') === 'Bearer fake-jwt-token';
    }

    function idFromUrl() {
      const urlParts = url.split('/');
      return parseInt(urlParts[urlParts.length - 1]);
    }
  }
}

export const fakeBackendProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: FakeBackendInterceptor,
  multi: true,
};
