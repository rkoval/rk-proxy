const chai = require('chai');
const app = require('../app');

chai.should();

describe('app', () => {
  describe('#getRedirectMapping', () => {
    const mockReq = (host) => {
      return {
        headers: {
          host
        }
      }
    };

    it('should populate the redirect based on a matched subdomain', () => {
      const req = mockReq('github.ryankoval.com');

      app.getRedirectMapping(req, null, (redirect) => {
        redirect.should.equal('https://github.com/rkoval');
      });
    });

    it('should populate the redirect from a fallback if none matched', () => {
      const req = mockReq('asdf')

      app.getRedirectMapping(req, null, (redirect) => {
        redirect.should.equal('http://localhost:3000');
      });
    });
  });
});

