import java.awt.Font;
import java.awt.font.FontRenderContext;
import java.awt.geom.AffineTransform;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import com.jpexs.decompiler.flash.SWF;
import com.jpexs.decompiler.flash.tags.base.*;
import com.jpexs.decompiler.flash.types.*;

/** Replaces text glyphs only. Does not decompile/recompile any original game action. */
public class LocalizeTu95 {
  static final FontRenderContext FRC=new FontRenderContext(new AffineTransform(),true,true);
  static int advance(Font font,char ch,int height){
    return (int)Math.round(font.deriveFont(1024f).getStringBounds(String.valueOf(ch),FRC).getWidth()*height/1024.0);
  }
  static TEXTRECORD style(StaticTextTag text) {
    TEXTRECORD first=text.textRecords.get(0), found=new TEXTRECORD();
    found.textColor=new RGB(0,0,0);
    for(TEXTRECORD row:text.textRecords) {
      if(row.styleFlagsHasFont) {found.fontId=row.fontId;found.textHeight=row.textHeight;}
      if(row.styleFlagsHasColor) {found.textColor=row.textColor;found.textColorA=row.textColorA;}
      if(found.fontId>0) break;
    }
    return found;
  }
  public static void main(String[] args) throws Exception {
    SWF swf=new SWF(new FileInputStream(args[0]),false);
    Font cjk=Font.createFont(Font.TRUETYPE_FONT,new File(args[2]));
    Map<Integer,String> translations=new LinkedHashMap<>();
    for(String line:Files.readAllLines(Path.of(args[3]),StandardCharsets.UTF_8)) {
      int tab=line.indexOf('\t');if(tab<0)continue;
      translations.put(Integer.parseInt(line.substring(0,tab)),line.substring(tab+1).replace("\\n","\n"));
    }
    // Populate all fonts before replacing records, because insertion shifts glyph indices.
    Map<Integer,Set<Character>> required=new TreeMap<>();
    for(var pair:translations.entrySet()) {
      StaticTextTag text=(StaticTextTag)swf.getCharacter(pair.getKey());
      if(text==null)throw new IllegalStateException("Missing text "+pair.getKey());
      int fontId=style(text).fontId;
      Set<Character> chars=required.computeIfAbsent(fontId,k->new TreeSet<>());
      for(char ch:pair.getValue().toCharArray())if(ch!='\n')chars.add(ch);
    }
    int added=0;
    for(var pair:required.entrySet()) {
      FontTag font=swf.getFont(pair.getKey());
      Font source=cjk.deriveFont(font.isBold()?Font.BOLD:Font.PLAIN,1024f);
      for(char ch:pair.getValue())if(!font.containsChar(ch)) {
        if(!source.canDisplay(ch) || !font.addCharacter(ch,source))throw new IllegalStateException("Cannot embed U+"+Integer.toHexString(ch));
        added++;
      }
      font.setModified(true);
    }
    int changed=0;
    for(var pair:translations.entrySet()) {
      StaticTextTag text=(StaticTextTag)swf.getCharacter(pair.getKey());
      TEXTRECORD base=style(text);FontTag font=swf.getFont(base.fontId);
      Font metrics=cjk.deriveFont(font.isBold()?Font.BOLD:Font.PLAIN);
      RECT bounds=new RECT(text.textBounds);
      // Bounds use the text matrix; text record coordinates precede that matrix.
      int tx=text.textMatrix.translateX,ty=text.textMatrix.translateY;
      String[] lines=pair.getValue().split("\n",-1);
      List<TEXTRECORD> rows=new ArrayList<>();
      int height=base.textHeight;
      int capacity=Math.max(bounds.getWidth(),height*2);
      for(String line:lines) {
        int width=0;
        for(int i=0;i<line.length();i++)width+=advance(metrics,line.charAt(i),height);
        if(width>capacity)height=Math.min(height,(int)(height*(double)capacity/width));
      }
      int lineStep=(int)(height*1.35);
      int baseline=(bounds.Ymin+bounds.Ymax)/2-ty+(int)(height*.38)-(lines.length-1)*lineStep/2;
      for(int l=0;l<lines.length;l++) {
        TEXTRECORD row=new TEXTRECORD();row.styleFlagsHasFont=row.styleFlagsHasColor=row.styleFlagsHasXOffset=row.styleFlagsHasYOffset=true;
        row.fontId=base.fontId;row.textHeight=height;row.textColor=base.textColor;row.textColorA=base.textColorA;
        row.yOffset=baseline+l*lineStep;row.glyphEntries=new ArrayList<>();int width=0;
        String line=lines[l];
        for(int i=0;i<line.length();i++) {
          char ch=line.charAt(i);GLYPHENTRY glyph=new GLYPHENTRY();glyph.glyphIndex=font.charToGlyph(ch);
          glyph.glyphAdvance=advance(metrics,ch,height);
          row.glyphEntries.add(glyph);width+=glyph.glyphAdvance;
        }
        row.xOffset=(bounds.Xmin+bounds.Xmax)/2-tx-width/2;rows.add(row);
      }
      text.textRecords=rows;text.setModified(true);text.updateTextBounds();changed++;
      System.out.println(pair.getKey()+"\t"+String.join(" / ",text.getTexts()));
    }
    try(OutputStream out=Files.newOutputStream(Path.of(args[1]))) {swf.saveTo(out);}
    System.out.println("Localized "+changed+" text tags, embedded "+added+" glyphs in "+required.size()+" existing fonts.");
  }
}
