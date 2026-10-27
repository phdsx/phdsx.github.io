import java.awt.Font;
import java.awt.font.FontRenderContext;
import java.awt.geom.AffineTransform;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import com.jpexs.decompiler.flash.SWF;
import com.jpexs.decompiler.flash.tags.DefineTextTag;
import com.jpexs.decompiler.flash.tags.base.FontTag;
import com.jpexs.decompiler.flash.types.*;

public class AddInstrumentText {
 public static void main(String[] args)throws Exception{
  SWF swf=new SWF(new FileInputStream(args[0]),false);
  Font source=Font.createFont(Font.TRUETYPE_FONT,new File(args[2])).deriveFont(Font.PLAIN,1024f);
  FontTag font=swf.getFont(282);
  String[] labels={"起飞","正常","着陆","速度","高度","雷达"};
  for(String label:labels)for(char ch:label.toCharArray())if(!font.containsChar(ch)){if(!font.addCharacter(ch,source))throw new Exception("missing glyph "+ch);}
  font.setModified(true);FontRenderContext frc=new FontRenderContext(new AffineTransform(),true,true);
  int where=swf.indexOfTag(font)+1;
  double[] centerX={41.5,41.5,41.5,-270.4,-154.4,-150.4};
  double[] baselineY={31.5,31.5,31.5,-16.4,-16.4,-121.4};
  for(int i=0;i<labels.length;i++){
   int id=60000+i;if(swf.getCharacter(id)!=null)throw new Exception("id exists");
   TEXTRECORD row=new TEXTRECORD();row.styleFlagsHasFont=row.styleFlagsHasColor=row.styleFlagsHasXOffset=row.styleFlagsHasYOffset=true;
   int height=i<3?200:120;
   row.fontId=282;row.textHeight=height;row.textColor=i<3?new RGB(255,255,255):new RGB(40,53,52);row.yOffset=(int)(baselineY[i]*20);row.glyphEntries=new ArrayList<>();int width=0;
   for(char ch:labels[i].toCharArray()) {GLYPHENTRY entry=new GLYPHENTRY();entry.glyphIndex=font.charToGlyph(ch);entry.glyphAdvance=(int)Math.round(source.getStringBounds(String.valueOf(ch),frc).getWidth()*height/1024);width+=entry.glyphAdvance;row.glyphEntries.add(entry);}
   row.xOffset=(int)(centerX[i]*20)-width/2;
   DefineTextTag text=new DefineTextTag(swf,id,new RECT(row.xOffset-100,row.xOffset+width+100,row.yOffset-height-100,row.yOffset+100),new MATRIX(),List.of(row));text.setModified(true);swf.addTag(where++,text);
  }
  try(OutputStream out=Files.newOutputStream(Path.of(args[1]))){swf.saveTo(out);}
 }
}
