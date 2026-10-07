"""WGS84 UTM zone 50N (EPSG:32650). Snyder transverse Mercator series."""
import numpy as np
RAD=np.pi/180; A=6378137.; E2=0.0066943799901413165; EP=E2/(1-E2); K=.9996
def forward(lon,lat):
 p=np.asarray(lat)*RAD; dl=(np.asarray(lon)-117)*RAD
 n=A/np.sqrt(1-E2*np.sin(p)**2); t=np.tan(p)**2; c=EP*np.cos(p)**2; aa=np.cos(p)*dl
 m=A*((1-E2/4-3*E2**2/64-5*E2**3/256)*p-(3*E2/8+3*E2**2/32+45*E2**3/1024)*np.sin(2*p)+(15*E2**2/256+45*E2**3/1024)*np.sin(4*p)-35*E2**3/3072*np.sin(6*p))
 return 500000+K*n*(aa+(1-t+c)*aa**3/6+(5-18*t+t*t+72*c-58*EP)*aa**5/120), K*(m+n*np.tan(p)*(aa*aa/2+(5-t+9*c+4*c*c)*aa**4/24+(61-58*t+t*t+600*c-330*EP)*aa**6/720))
def inverse(e,n):
 m=np.asarray(n)/K; mu=m/(A*(1-E2/4-3*E2**2/64-5*E2**3/256)); e1=(1-np.sqrt(1-E2))/(1+np.sqrt(1-E2))
 p=mu+(3*e1/2-27*e1**3/32)*np.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*np.sin(4*mu)+151*e1**3/96*np.sin(6*mu)+1097*e1**4/512*np.sin(8*mu)
 c=EP*np.cos(p)**2; t=np.tan(p)**2; nn=A/np.sqrt(1-E2*np.sin(p)**2); r=A*(1-E2)/(1-E2*np.sin(p)**2)**1.5; d=(np.asarray(e)-500000)/(nn*K)
 lat=p-nn*np.tan(p)/r*(d*d/2-(5+3*t+10*c-4*c*c-9*EP)*d**4/24+(61+90*t+298*c+45*t*t-252*EP-3*c*c)*d**6/720)
 lon=117*RAD+(d-(1+2*t+c)*d**3/6+(5-2*c+28*t-3*c*c+8*EP+24*t*t)*d**5/120)/np.cos(p)
 return lon/RAD,lat/RAD
ORIGIN=[119.78,25.53]
OE,ON=forward(*ORIGIN)
def local(lon,lat):
 e,n=forward(lon,lat); return e-OE,ON-n
def geographic(x,z): return inverse(OE+np.asarray(x),ON-np.asarray(z))
