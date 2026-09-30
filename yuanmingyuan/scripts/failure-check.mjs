import {chromium} from 'playwright';
const b=await chromium.launch({headless:true,executablePath:'C:/Users/YUE/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
const p=await b.newPage();p.on('console',m=>{if(m.type()==='error')console.log(m.text())});await p.route('**/textures/rock-color.webp',r=>r.abort('failed'));await p.goto('http://127.0.0.1:5186/');await p.waitForSelector('#retry:not([hidden])');console.log('TEXT',await p.locator('#loading-text').innerText());await p.screenshot({path:'evidence/resource-failure.png'});await b.close();
